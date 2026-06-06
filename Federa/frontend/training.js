// Federa训练工作台功能
document.addEventListener('DOMContentLoaded', () => {
    // 训练工作台元素
    const startTrainingBtn = document.getElementById('start-training');
    const generateProofBtn = document.getElementById('generate-proof');
    const submitGradientBtn = document.getElementById('submit-gradient');
    const zkProgress = document.getElementById('zk-progress');
    const zkStatus = document.getElementById('zk-status');
    const gradientStatus = document.getElementById('gradient-status');
    const accuracyEl = document.getElementById('accuracy');
    const lossEl = document.getElementById('loss');
    const contributionEl = document.getElementById('contribution');
    const rewardEl = document.getElementById('reward');
    
    // 模拟训练状态
    let trainingState = {
        isTraining: false,
        epoch: 0,
        maxEpochs: 10,
        accuracy: 0.1,
        loss: 2.3,
        contribution: 0,
        reward: 0
    };

    // 开始训练按钮事件
    if (startTrainingBtn) {
        startTrainingBtn.addEventListener('click', startTraining);
    }

    // 生成ZK证明按钮事件
    if (generateProofBtn) {
        generateProofBtn.addEventListener('click', generateZKProof);
    }

    // 提交梯度按钮事件
    if (submitGradientBtn) {
        submitGradientBtn.addEventListener('click', submitGradient);
    }

    // 开始训练
    function startTraining() {
        if (trainingState.isTraining) {
            stopTraining();
            return;
        }

        trainingState.isTraining = true;
        startTrainingBtn.innerHTML = '<i class="fas fa-stop"></i> 停止训练';
        startTrainingBtn.classList.remove('btn-success');
        startTrainingBtn.classList.add('btn-danger');

        // 更新状态指示器
        updateStatusIndicator('active', '训练中...');
        
        // 开始训练循环
        const trainingInterval = setInterval(() => {
            if (!trainingState.isTraining) {
                clearInterval(trainingInterval);
                return;
            }

            // 模拟训练过程
            simulateTrainingStep();
            
            // 更新UI
            updateTrainingUI();
        }, 1000);
    }

    // 停止训练
    function stopTraining() {
        trainingState.isTraining = false;
        startTrainingBtn.innerHTML = '<i class="fas fa-play"></i> 开始训练';
        startTrainingBtn.classList.remove('btn-danger');
        startTrainingBtn.classList.add('btn-success');
        
        // 更新状态指示器
        updateStatusIndicator('idle', '就绪');
    }

    // 模拟训练步骤
    function simulateTrainingStep() {
        trainingState.epoch++;
        
        // 模拟模型改进
        if (trainingState.accuracy < 0.95) {
            trainingState.accuracy = Math.min(0.95, trainingState.accuracy + 0.02 * Math.random());
        }
        
        if (trainingState.loss > 0.1) {
            trainingState.loss = Math.max(0.1, trainingState.loss - 0.1 * Math.random());
        }
        
        // 模拟贡献分和奖励计算
        trainingState.contribution = parseFloat((trainingState.contribution + 0.05 * Math.random()).toFixed(2));
        trainingState.reward = parseFloat((trainingState.contribution * 10).toFixed(2));
        
        // 如果达到最大轮次，停止训练
        if (trainingState.epoch >= trainingState.maxEpochs) {
            stopTraining();
        }
    }

    // 更新训练UI
    function updateTrainingUI() {
        if (accuracyEl) accuracyEl.textContent = `${(trainingState.accuracy * 100).toFixed(2)}%`;
        if (lossEl) lossEl.textContent = trainingState.loss.toFixed(4);
        if (contributionEl) contributionEl.textContent = trainingState.contribution.toFixed(2);
        if (rewardEl) rewardEl.textContent = `${trainingState.reward.toFixed(2)} FED`;
    }

    // 更新状态指示器
    function updateStatusIndicator(status, text) {
        const statusIndicator = document.querySelector('.status-indicator');
        if (!statusIndicator) return;

        const statusDot = statusIndicator.querySelector('.status-dot');
        if (statusDot) {
            statusDot.className = `status-dot status-${status}`;
        }

        const statusText = statusIndicator.querySelector('span:last-child');
        if (statusText) {
            statusText.textContent = text;
        }
    }

    // 生成ZK证明
    function generateZKProof() {
        if (!trainingState.isTraining) {
            alert('请先开始训练！');
            return;
        }

        // 显示进度
        zkStatus.textContent = '生成证明中...';
        zkStatus.style.color = '#f59e0b';
        
        // 模拟ZK证明生成过程
        let progress = 0;
        const proofInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(proofInterval);
                
                // 证明生成完成
                zkProgress.style.width = '100%';
                zkStatus.textContent = 'ZK证明生成完成！';
                zkStatus.style.color = '#10b981';
                
                // 启用提交按钮
                if (submitGradientBtn) {
                    submitGradientBtn.disabled = false;
                    submitGradientBtn.classList.remove('btn-disabled');
                }
            } else {
                zkProgress.style.width = `${progress}%`;
            }
        }, 200);
    }

    // 提交梯度
    function submitGradient() {
        if (!zkStatus || !zkStatus.textContent.includes('完成')) {
            alert('请先生成ZK证明！');
            return;
        }

        gradientStatus.textContent = '提交中...';
        gradientStatus.style.color = '#f59e0b';

        // 模拟提交过程
        setTimeout(() => {
            gradientStatus.textContent = '梯度提交成功！';
            gradientStatus.style.color = '#10b981';
            
            // 更新活动日志 - 使用document.getElementById获取活动feed并添加新项
            const feed = document.getElementById('activity-feed');
            if (feed) {
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <div class="activity-icon">
                        <i class="fas fa-sync-alt"></i>
                    </div>
                    <div class="activity-content">
                        <p>梯度成功提交到当前任务</p>
                        <small>刚刚</small>
                    </div>
                `;
                feed.prepend(item);
            }
            
            // 重置ZK证明状态
            setTimeout(() => {
                if (zkProgress) zkProgress.style.width = '0%';
                if (zkStatus) {
                    zkStatus.textContent = '准备生成证明...';
                    zkStatus.style.color = '#6b7280';
                }
                if (generateProofBtn) generateProofBtn.disabled = false;
                if (submitGradientBtn) {
                    submitGradientBtn.disabled = true;
                    submitGradientBtn.classList.add('btn-disabled');
                }
            }, 2000);
        }, 1500);
    }

    // 初始化训练指标
    updateTrainingUI();
});