"""
Federa 聚合节点服务
负责收集梯度、执行统计检测、聚合梯度、计算贡献评分等功能
"""

import torch
import torch.nn as nn
import numpy as np
from typing import Dict, List, Tuple, Any
import hashlib
import json
from scipy.spatial.distance import cosine as cosine_distance
from collections import defaultdict
import time


class FederaAggregator:
    """Federa聚合节点服务"""
    
    def __init__(self, model_architecture: str = "SimpleMLP"):
        """
        初始化聚合节点
        :param model_architecture: 模型架构名称
        """
        self.model_architecture = model_architecture
        self.gradient_buffer = {}  # 存储接收到的梯度
        self.config = {
            'norm_min': 1e-6,      # 梯度范数下限
            'norm_max': 1e3,       # 梯度范数上限
            'cosine_threshold': 0.95,  # 余弦相似度阈值
            'adversarial_threshold': -0.5  # 对抗方向阈值
        }
        print(f"Aggregator initialized for model: {model_architecture}")
    
    def add_gradient(self, node_id: str, gradient_data: Dict[str, List[float]], 
                     model_hash: str, data_commitment: str) -> bool:
        """
        添加来自训练节点的梯度
        :param node_id: 训练节点ID
        :param gradient_data: 梯度数据
        :param model_hash: 模型哈希
        :param data_commitment: 数据承诺
        :return: 是否添加成功
        """
        print(f"Received gradient from node {node_id}")
        
        self.gradient_buffer[node_id] = {
            'gradients': {k: torch.tensor(v) for k, v in gradient_data.items()},
            'model_hash': model_hash,
            'data_commitment': data_commitment,
            'timestamp': time.time()
        }
        
        return True
    
    def compute_l2_norm(self, gradients: Dict[str, torch.Tensor]) -> float:
        """
        计算梯度的L2范数
        :param gradients: 梯度字典
        :return: L2范数
        """
        total_norm = 0.0
        for grad in gradients.values():
            total_norm += grad.norm(2).item() ** 2
        return total_norm ** 0.5
    
    def cosine_similarity(self, grad1: torch.Tensor, grad2: torch.Tensor) -> float:
        """
        计算两个梯度向量的余弦相似度
        :param grad1: 第一个梯度向量
        :param grad2: 第二个梯度向量
        :return: 余弦相似度
        """
        # 将梯度展平为一维向量
        flat_grad1 = grad1.flatten()
        flat_grad2 = grad2.flatten()
        
        # 计算余弦相似度
        dot_product = torch.dot(flat_grad1, flat_grad2).item()
        norm1 = flat_grad1.norm().item()
        norm2 = flat_grad2.norm().item()
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = dot_product / (norm1 * norm2)
        return similarity
    
    def quality_check(self) -> Tuple[Dict[str, str], Dict[str, Dict[str, torch.Tensor]]]:
        """
        执行质量检查，包括梯度范数检测和余弦相似度检测
        :return: 检测结果和有效梯度
        """
        print("Starting quality check...")
        
        results = {}
        valid_grads = {}
        
        # 1. L2范数过滤
        for node_id, data in self.gradient_buffer.items():
            grad_norm = self.compute_l2_norm(data['gradients'])
            
            if grad_norm < self.config['norm_min']:
                results[node_id] = "REJECTED: gradient_norm_too_small"
                print(f"Node {node_id} rejected: gradient norm too small ({grad_norm:.6f})")
            elif grad_norm > self.config['norm_max']:
                results[node_id] = "REJECTED: gradient_norm_too_large"
                print(f"Node {node_id} rejected: gradient norm too large ({grad_norm:.6f})")
            else:
                results[node_id] = "PASSED: norm_check"
                valid_grads[node_id] = data['gradients']
                print(f"Node {node_id} passed norm check: {grad_norm:.6f}")
        
        # 2. 余弦相似度检测（梯度复制）
        valid_node_ids = list(valid_grads.keys())
        duplicate_groups = []
        
        for i in range(len(valid_node_ids)):
            for j in range(i+1, len(valid_node_ids)):
                node_i, node_j = valid_node_ids[i], valid_node_ids[j]
                
                # 计算所有层梯度的平均余弦相似度
                similarities = []
                for layer_name in valid_grads[node_i].keys():
                    if layer_name in valid_grads[node_j]:
                        sim = self.cosine_similarity(
                            valid_grads[node_i][layer_name], 
                            valid_grads[node_j][layer_name]
                        )
                        similarities.append(sim)
                
                if similarities:
                    avg_similarity = sum(similarities) / len(similarities)
                    if avg_similarity > self.config['cosine_threshold']:
                        duplicate_groups.append((node_i, node_j, avg_similarity))
                        print(f"Potential duplication detected between {node_i} and {node_j}: {avg_similarity:.3f}")
        
        # 标记重复梯度（保留第一个）
        for node_i, node_j, similarity in duplicate_groups:
            results[node_j] = f"REJECTED: suspected_gradient_copy (similarity: {similarity:.3f})"
            del valid_grads[node_j]
            print(f"Node {node_j} rejected for suspected gradient copy")
        
        # 3. 对抗方向检测
        if len(valid_grads) >= 3:
            # 计算聚合梯度作为参考方向
            aggregate_grad = self.federated_average(list(valid_grads.values()))
            
            for node_id, grad in valid_grads.items():
                # 计算该节点梯度与聚合梯度的余弦相似度
                similarities = []
                for layer_name in grad.keys():
                    if layer_name in aggregate_grad:
                        sim = self.cosine_similarity(grad[layer_name], aggregate_grad[layer_name])
                        similarities.append(sim)
                
                if similarities:
                    avg_sim = sum(similarities) / len(similarities)
                    if avg_sim < self.config['adversarial_threshold']:
                        results[node_id] = f"REJECTED: suspected_adversarial (similarity: {avg_sim:.3f})"
                        del valid_grads[node_id]
                        print(f"Node {node_id} rejected for suspected adversarial gradient: {avg_sim:.3f}")
        
        print(f"Quality check completed. Valid gradients: {len(valid_grads)}, Rejected: {len(results) - len(valid_grads)}")
        return results, valid_grads
    
    def federated_average(self, gradients_list: List[Dict[str, torch.Tensor]]) -> Dict[str, torch.Tensor]:
        """
        执行联邦平均聚合
        :param gradients_list: 梯度列表
        :return: 聚合后的梯度
        """
        print(f"Performing federated averaging on {len(gradients_list)} gradients...")
        
        if not gradients_list:
            return {}
        
        # 获取所有键名
        all_keys = set()
        for grad_dict in gradients_list:
            all_keys.update(grad_dict.keys())
        
        # 计算平均值
        averaged_gradients = {}
        n = len(gradients_list)
        
        for key in all_keys:
            # 收集所有梯度中对应键的值
            layer_gradients = []
            for grad_dict in gradients_list:
                if key in grad_dict:
                    layer_gradients.append(grad_dict[key])
            
            if layer_gradients:
                # 计算平均值
                stacked = torch.stack(layer_gradients)
                averaged_gradients[key] = torch.mean(stacked, dim=0)
        
        print("Federated averaging completed")
        return averaged_gradients
    
    def compute_loo_contribution(self, all_gradients: Dict[str, Dict[str, torch.Tensor]], 
                                performance_fn) -> Dict[str, float]:
        """
        计算Leave-One-Out (LOO)贡献评分
        :param all_gradients: 所有梯度字典
        :param performance_fn: 性能评估函数
        :return: 贡献评分字典
        """
        print("Computing LOO contribution scores...")
        
        if len(all_gradients) == 0:
            return {}
        
        node_ids = list(all_gradients.keys())
        contributions = {}
        
        # 计算全量聚合的性能
        all_grads_list = list(all_gradients.values())
        full_aggregate = self.federated_average(all_grads_list)
        full_performance = performance_fn(full_aggregate)
        
        # 计算每个节点的LOO贡献
        for node_id in node_ids:
            # 计算排除当前节点的聚合
            remaining_grads = [grad for nid, grad in all_gradients.items() if nid != node_id]
            if remaining_grads:
                partial_aggregate = self.federated_average(remaining_grads)
                partial_performance = performance_fn(partial_aggregate)
                
                # LOO贡献 = 完整性能 - 部分性能
                contribution = full_performance - partial_performance
                contributions[node_id] = contribution
                print(f"Node {node_id} LOO contribution: {contribution:.6f}")
            else:
                # 只有一个节点的情况
                contributions[node_id] = full_performance
                print(f"Node {node_id} LOO contribution (only node): {full_performance:.6f}")
        
        return contributions
    
    def dummy_performance_function(self, aggregated_gradient: Dict[str, torch.Tensor]) -> float:
        """
        模拟性能评估函数（在实际实现中，这会评估模型在验证集上的性能）
        :param aggregated_gradient: 聚合后的梯度
        :return: 性能分数
        """
        # 这里只是模拟，实际实现中会更复杂
        total_norm = 0.0
        count = 0
        for grad in aggregated_gradient.values():
            total_norm += grad.norm().item()
            count += 1
        
        avg_norm = total_norm / count if count > 0 else 0.0
        # 简单的性能分数，与梯度范数相关
        performance = 0.95 - abs(avg_norm * 0.01)  # 假设基础性能为0.95
        return max(0.0, min(1.0, performance))  # 限制在[0,1]范围内
    
    def process_round(self) -> Tuple[Dict[str, Dict[str, torch.Tensor]], Dict[str, float], str]:
        """
        处理一轮训练的所有步骤：质量检查 -> 聚合 -> 贡献评分
        :return: (有效梯度, 贡献评分, 新模型哈希)
        """
        print("Processing round...")
        
        # 1. 执行质量检查
        quality_results, valid_gradients = self.quality_check()
        
        if not valid_gradients:
            print("No valid gradients after quality check")
            return {}, {}, ""
        
        # 2. 执行联邦平均聚合
        aggregated_gradient = self.federated_average(list(valid_gradients.values()))
        
        # 3. 计算贡献评分
        contributions = self.compute_loo_contribution(
            valid_gradients, 
            self.dummy_performance_function
        )
        
        # 4. 计算新模型哈希（模拟）
        # 在实际实现中，这会基于聚合梯度更新模型参数后计算哈希
        grad_bytes = b""
        for layer_name, grad_tensor in aggregated_gradient.items():
            grad_bytes += grad_tensor.flatten().detach().cpu().numpy().tobytes()
        new_model_hash = hashlib.sha256(grad_bytes).hexdigest()
        
        print(f"Round processing completed. Aggregated gradients from {len(valid_gradients)} nodes")
        return valid_gradients, contributions, new_model_hash
    
    def reset_buffer(self):
        """重置梯度缓冲区"""
        self.gradient_buffer.clear()
        print("Gradient buffer reset")


# 示例使用
if __name__ == "__main__":
    # 创建聚合节点实例
    aggregator = FederaAggregator()
    
    # 模拟接收来自多个训练节点的梯度
    print("Simulating receiving gradients from training nodes...")
    
    # 模拟一些梯度数据
    node1_grads = {
        'fc1.weight': [0.1, -0.2, 0.3] * 100,  # 模拟100个参数
        'fc1.bias': [0.05, -0.1],
        'fc2.weight': [0.15, 0.25] * 50,
        'fc2.bias': [0.08]
    }
    
    node2_grads = {
        'fc1.weight': [0.12, -0.18, 0.32] * 100,  # 稍有不同的梯度
        'fc1.bias': [0.06, -0.09],
        'fc2.weight': [0.14, 0.26] * 50,
        'fc2.bias': [0.09]
    }
    
    node3_grads = {
        'fc1.weight': [0.1, -0.2, 0.3] * 100,  # 与node1相同的梯度（模拟复制）
        'fc1.bias': [0.05, -0.1],
        'fc2.weight': [0.15, 0.25] * 50,
        'fc2.bias': [0.08]
    }
    
    # 添加梯度到缓冲区
    aggregator.add_gradient("node1", node1_grads, "model_hash_1", "data_commitment_1")
    aggregator.add_gradient("node2", node2_grads, "model_hash_2", "data_commitment_2")
    aggregator.add_gradient("node3", node3_grads, "model_hash_3", "data_commitment_3")
    
    # 处理这一轮
    valid_gradients, contributions, new_model_hash = aggregator.process_round()
    
    print(f"\nResults:")
    print(f"Valid gradients: {list(valid_gradients.keys())}")
    print(f"Contributions: {contributions}")
    print(f"New model hash: {new_model_hash[:16]}...")
    
    # 显示贡献排序
    sorted_contributions = sorted(contributions.items(), key=lambda x: x[1], reverse=True)
    print(f"\nSorted contributions:")
    for node_id, contrib in sorted_contributions:
        print(f"  {node_id}: {contrib:.6f}")