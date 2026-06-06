"""
统计质量检测模块
用于检测梯度异常，防止搭便车、梯度复制和对抗性梯度
"""

import numpy as np
from typing import Dict, List, Tuple, Any
import math


class StatisticalQualityChecker:
    """
    统计质量检测器
    实现梯度L2范数检测、余弦相似度检测等功能
    """
    
    def __init__(self, 
                 norm_min: float = 1e-6, 
                 norm_max: float = 1e3, 
                 cosine_threshold: float = 0.95,
                 adversarial_threshold: float = -0.5):
        """
        初始化检测器参数
        :param norm_min: 梯度L2范数下限
        :param norm_max: 梯度L2范数上限
        :param cosine_threshold: 余弦相似度阈值，超过此值认为是复制梯度
        :param adversarial_threshold: 对抗性梯度阈值，低于此值认为是对抗性梯度
        """
        self.norm_min = norm_min
        self.norm_max = norm_max
        self.cosine_threshold = cosine_threshold
        self.adversarial_threshold = adversarial_threshold
    
    def l2_norm(self, vector: np.ndarray) -> float:
        """
        计算向量的L2范数
        :param vector: 输入向量
        :return: L2范数
        """
        return np.linalg.norm(vector, ord=2)
    
    def cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """
        计算两个向量的余弦相似度
        :param vec1: 向量1
        :param vec2: 向量2
        :return: 余弦相似度
        """
        dot_product = np.dot(vec1.flatten(), vec2.flatten())
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    def quality_check(self, gradients: Dict[str, np.ndarray], 
                     stake_info: Dict[str, float] = None) -> Tuple[Dict[str, str], Dict[str, np.ndarray]]:
        """
        执行质量检测
        :param gradients: 梯度字典，key为节点ID，value为梯度向量
        :param stake_info: 质押信息，key为节点ID，value为质押金额
        :return: (检测结果, 有效梯度)
        """
        results = {}
        valid_grads = {}
        
        # 1. L2范数检测
        for node_id, grad in gradients.items():
            # 将所有层的梯度展平并连接
            flat_grad = np.concatenate([layer.flatten() for layer in grad.values()])
            norm = self.l2_norm(flat_grad)
            
            if norm < self.norm_min:
                results[node_id] = "REJECTED: gradient_norm_too_small"
            elif norm > self.norm_max:
                results[node_id] = "REJECTED: gradient_norm_too_large"
            else:
                results[node_id] = "PASSED: norm_check"
                valid_grads[node_id] = grad
        
        # 2. 余弦相似度检测（梯度复制）
        valid_ids = list(valid_grads.keys())
        duplicate_groups = []
        
        for i in range(len(valid_ids)):
            for j in range(i+1, len(valid_ids)):
                node_i, node_j = valid_ids[i], valid_ids[j]
                
                # 计算梯度相似度
                grad_i_flat = np.concatenate([layer.flatten() for layer in valid_grads[node_i].values()])
                grad_j_flat = np.concatenate([layer.flatten() for layer in valid_grads[node_j].values()])
                
                sim = self.cosine_similarity(grad_i_flat, grad_j_flat)
                
                if sim > self.cosine_threshold:
                    duplicate_groups.append((node_i, node_j))
        
        # 处理重复梯度：保留质押额更高的节点
        for group in duplicate_groups:
            if len(group) == 2:
                node1, node2 = group
                if node1 in valid_grads and node2 in valid_grads:
                    # 如果提供了质押信息，保留质押更高的节点
                    if stake_info:
                        if stake_info.get(node1, 0) >= stake_info.get(node2, 0):
                            results[node2] = "REJECTED: suspected_gradient_copy"
                            del valid_grads[node2]
                        else:
                            results[node1] = "REJECTED: suspected_gradient_copy"
                            del valid_grads[node1]
                    else:
                        # 如果没有质押信息，默认保留第一个
                        results[node2] = "REJECTED: suspected_gradient_copy"
                        del valid_grads[node2]
        
        # 3. 对抗方向检测
        if len(valid_grads) >= 3:
            # 计算平均梯度作为全局方向
            all_grads_flat = []
            for grad in valid_grads.values():
                flat_grad = np.concatenate([layer.flatten() for layer in grad.values()])
                all_grads_flat.append(flat_grad)
            
            if all_grads_flat:
                avg_grad = np.mean(all_grads_flat, axis=0)
                
                for node_id, grad in valid_grads.copy().items():
                    grad_flat = np.concatenate([layer.flatten() for layer in grad.values()])
                    cos_sim = self.cosine_similarity(grad_flat, avg_grad)
                    
                    if cos_sim < self.adversarial_threshold:
                        results[node_id] = "REJECTED: suspected_adversarial"
                        del valid_grads[node_id]
        
        return results, valid_grads


class ContributionCalculator:
    """
    贡献计算器
    实现LOO（Leave-One-Out）贡献计算
    """
    
    def __init__(self):
        pass
    
    def compute_loo_contribution(self, 
                                all_gradients: Dict[str, np.ndarray],
                                performance_func) -> Dict[str, float]:
        """
        计算LOO（Leave-One-Out）贡献
        :param all_gradients: 所有节点的梯度
        :param performance_func: 性能评估函数，接受梯度列表并返回性能指标
        :return: 每个节点的贡献值
        """
        node_ids = list(all_gradients.keys())
        contributions = {}
        
        # 计算全量聚合的性能
        all_grads_list = [all_gradients[node_id] for node_id in node_ids]
        full_performance = performance_func(all_grads_list)
        
        # 计算每个节点的LOO贡献
        for node_id in node_ids:
            # 创建排除当前节点的梯度列表
            remaining_grads = [all_gradients[nid] for nid in node_ids if nid != node_id]
            reduced_performance = performance_func(remaining_grads)
            
            # 计算LOO贡献：包含该节点时的性能 - 不包含该节点时的性能
            contribution = full_performance - reduced_performance
            contributions[node_id] = contribution
        
        return contributions


def mock_performance_function(gradients_list):
    """
    模拟性能评估函数
    在实际实现中，这将是一个模型评估函数，返回准确率等指标
    """
    # 这里只是模拟，实际实现会更复杂
    if not gradients_list:
        return 0.0
    
    # 模拟性能计算（实际会使用模型在验证集上的表现）
    total_effect = 0.0
    for grad in gradients_list:
        # 简单模拟：梯度幅度越大，对性能的影响越大
        grad_magnitude = sum(np.sum(np.abs(layer)) for layer in grad.values())
        total_effect += grad_magnitude
    
    # 返回一个模拟的性能指标
    return min(0.95, 0.7 + total_effect * 0.0001)  # 假设基础性能0.7，最大0.95


# 示例使用
if __name__ == "__main__":
    # 创建模拟梯度数据
    mock_gradients = {
        "node_0x123": {
            "layer1.weight": np.random.normal(0, 0.01, (10, 10)),
            "layer2.bias": np.random.normal(0, 0.01, (5,))
        },
        "node_0x456": {
            "layer1.weight": np.random.normal(0, 0.01, (10, 10)),
            "layer2.bias": np.random.normal(0, 0.01, (5,))
        },
        "node_0x789": {
            "layer1.weight": np.zeros((10, 10)),  # 零梯度，可能被检测为搭便车
            "layer2.bias": np.zeros((5,))
        }
    }
    
    # 创建检测器
    checker = StatisticalQualityChecker()
    
    # 执行质量检测
    results, valid_gradients = checker.quality_check(mock_gradients)
    
    print("质量检测结果:")
    for node_id, result in results.items():
        print(f"  {node_id}: {result}")
    
    print(f"\n有效梯度节点数: {len(valid_gradients)}")
    
    # 计算贡献度
    if valid_gradients:
        calc = ContributionCalculator()
        contributions = calc.compute_loo_contribution(valid_gradients, mock_performance_function)
        
        print("\n贡献度计算结果:")
        for node_id, contrib in contributions.items():
            print(f"  {node_id}: {contrib:.6f}")