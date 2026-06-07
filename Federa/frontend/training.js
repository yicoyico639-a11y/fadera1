// Federa Training Workbench Logic - High-End Optimized
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const taskSelector = document.getElementById('current-task');
    const startTrainingBtn = document.getElementById('start-training');
    const generateProofBtn = document.getElementById('generate-proof');
    const submitGradientBtn = document.getElementById('submit-gradient');
    const zkProgress = document.getElementById('zk-progress');
    const zkProgressText = document.getElementById('zk-progress-text');
    const zkStatus = document.getElementById('zk-status');
    
    const accuracyEl = document.getElementById('accuracy');
    const lossEl = document.getElementById('loss');
    const contributionEl = document.getElementById('contribution');
    const rewardEl = document.getElementById('reward');
    
    // Aggregator panel elements
    const runAggregationBtn = document.getElementById('run-aggregation');
    const submitModelBtn = document.getElementById('submit-model');
    
    // Challenge button
    const challengeBtn = document.getElementById('challenge-aggregator');
    
    // State
    let trainingState = {
        isTraining: false,
        epoch: 0,
        maxEpochs: 10,
        accuracy: 0.1,
        loss: 2.3,
        contribution: 0,
        reward: 0,
        taskSelected: false
    };

    // 全局任务进度模拟（每完成一轮训练，更新当前选中任务的进度）
    let currentTaskId = null; // 简化：实际应用中需要知道具体任务ID，这里模拟更新第一个任务

    // Enable training when task is selected
    if (taskSelector) {
        taskSelector.addEventListener('change', (e) => {
            if (e.target.value) {
                trainingState.taskSelected = true;
                startTrainingBtn.disabled = false;
                zkStatus.textContent = '模型同步完成';
                showToast('Global model synchronized from IPFS', 'success');
                // 设定当前任务为静态任务（简化处理）
                currentTaskId = 'static-task';
            } else {
                trainingState.taskSelected = false;
                startTrainingBtn.disabled = true;
                zkStatus.textContent = '就绪';
                currentTaskId = null;
            }
        });
    }

    if (startTrainingBtn) {
        startTrainingBtn.addEventListener('click', () => {
            if (trainingState.isTraining) {
                stopTraining();
            } else {
                startTraining();
            }
        });
    }

    function startTraining() {
        trainingState.isTraining = true;
        trainingState.epoch = 0;
        startTrainingBtn.innerHTML = '<i class="fas fa-stop"></i> 停止训练';
        startTrainingBtn.classList.remove('btn-primary');
        startTrainingBtn.classList.add('btn-secondary');
        zkStatus.textContent = '本地训练中...';

        const interval = setInterval(() => {
            if (!trainingState.isTraining) {
                clearInterval(interval);
                return;
            }

            trainingState.epoch++;
            trainingState.accuracy = Math.min(0.98, trainingState.accuracy + Math.random() * 0.1);
            trainingState.loss = Math.max(0.05, trainingState.loss - Math.random() * 0.3);
            trainingState.contribution = (parseFloat(trainingState.contribution) + Math.random() * 0.05).toFixed(3);
            trainingState.reward = (trainingState.contribution * 45).toFixed(2);

            updateUI();

            // 每完成一轮，更新任务市场中的进度（针对当前选中的任务）
            if (currentTaskId === 'static-task') {
                updateTaskProgress(15 + trainingState.epoch, 100); // 初始15轮，每轮+1
            }

            if (trainingState.epoch >= trainingState.maxEpochs) {
                stopTraining();
                zkStatus.textContent = '训练完成';
                generateProofBtn.disabled = false;
                showToast('Local training finished. Ready for ZK Proof.', 'success');
            }
        }, 1000);
    }

    function updateTaskProgress(current, total) {
        // 更新静态任务卡片上的进度条和文本
        const taskCard = document.querySelector('#tasks-list .item-card:first-child');
        if (taskCard) {
            const progressText = taskCard.querySelector('.task-progress-text');
            const progressBar = taskCard.querySelector('.task-progress-bar');
            if (progressText) progressText.textContent = `${current} / ${total} 轮`;
            if (progressBar) {
                const percent = (current / total) * 100;
                progressBar.style.width = `${percent}%`;
            }
        }
    }

    function stopTraining() {
        trainingState.isTraining = false;
        startTrainingBtn.innerHTML = '<i class="fas fa-play"></i> 开始本地训练';
        startTrainingBtn.classList.add('btn-primary');
        startTrainingBtn.classList.remove('btn-secondary');
    }

    function updateUI() {
        if (accuracyEl) accuracyEl.textContent = (trainingState.accuracy * 100).toFixed(1) + '%';
        if (lossEl) lossEl.textContent = trainingState.loss.toFixed(4);
        if (contributionEl) contributionEl.textContent = trainingState.contribution;
        if (rewardEl) rewardEl.textContent = trainingState.reward + ' FED';
    }

    if (generateProofBtn) {
        generateProofBtn.addEventListener('click', () => {
            generateProofBtn.disabled = true;
            generateProofBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成中...';
            zkStatus.textContent = 'RISC Zero zkVM 运行中';
            
            let p = 0;
            const pInterval = setInterval(() => {
                p += Math.floor(Math.random() * 15) + 5;
                if (p >= 100) {
                    p = 100;
                    clearInterval(pInterval);
                    zkStatus.textContent = 'ZK 证明已就绪';
                    generateProofBtn.innerHTML = '<i class="fas fa-check"></i> 证明生成完毕';
                    submitGradientBtn.disabled = false;
                    showToast('SNARK Proof generated successfully', 'success');
                }
                if (zkProgress) zkProgress.style.width = p + '%';
                if (zkProgressText) zkProgressText.textContent = p + '%';
            }, 400);
        });
    }

    if (submitGradientBtn) {
        submitGradientBtn.addEventListener('click', async () => {
            submitGradientBtn.disabled = true;
            submitGradientBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上链提交中...';
            try {
                await window.simulateTransaction('提交梯度与ZK证明');
                showToast('Gradient & Proof submitted to contract', 'success');
                submitGradientBtn.innerHTML = '<i class="fas fa-check"></i> 提交成功';
                zkStatus.textContent = '等待聚合...';
                if (typeof addActivity === 'function') addActivity('Submitted round gradients to contract', 'Just now');
            } catch (err) {
                showToast('提交失败', 'error');
            } finally {
                submitGradientBtn.disabled = false;
            }
        });
    }

    // === 聚合节点逻辑 ===
    if (runAggregationBtn) {
        runAggregationBtn.addEventListener('click', async () => {
            runAggregationBtn.disabled = true;
            runAggregationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 聚合中...';
            setTimeout(() => {
                const contributions = { 'Alice (0xAlice)': 0.42, 'Bob (0xBob)': 0.38 };
                let contribText = '';
                for (const [node, score] of Object.entries(contributions)) {
                    contribText += `${node}: ${score.toFixed(3)} `;
                }
                showToast(`贡献评分计算完成: ${contribText}`, 'success');
                if (contributionEl) contributionEl.innerText = '0.80';
                if (rewardEl) rewardEl.innerText = '36.0 FED';
                runAggregationBtn.disabled = false;
                submitModelBtn.disabled = false;
                runAggregationBtn.innerHTML = '<i class="fas fa-check"></i> 聚合完成';
                if (typeof addActivity === 'function') addActivity('聚合节点执行聚合并计算贡献评分', 'Just now');
            }, 2000);
        });
    }

    if (submitModelBtn) {
        submitModelBtn.addEventListener('click', async () => {
            submitModelBtn.disabled = true;
            submitModelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交上链...';
            try {
                await window.simulateTransaction('提交新模型与贡献评分');
                showToast('新全局模型已提交，性能哈希已上链', 'success');
                submitModelBtn.innerHTML = '<i class="fas fa-check-circle"></i> 已提交';
                if (typeof addActivity === 'function') addActivity('聚合节点提交新模型，版本已更新', 'Just now');
            } catch (err) {
                showToast('提交失败', 'error');
            } finally {
                submitModelBtn.disabled = false;
            }
        });
    }

    // 挑战聚合节点
    if (challengeBtn) {
        challengeBtn.addEventListener('click', async () => {
            if (!window.currentAccount) return showToast('请先连接钱包', 'warning');
            showToast('正在提交挑战，需要质押 100 FED...', 'info');
            setTimeout(() => {
                showToast('挑战成功！作恶聚合节点质押已被罚没，您获得了 50 FED 奖励', 'success');
                if (typeof addActivity === 'function') addActivity('发起聚合挑战并获胜', 'Just now');
            }, 2000);
        });
    }

    // Helper function showToast
    function showToast(msg, type) {
        if (typeof window.showToast === 'function') window.showToast(msg, type);
        else console.log(`[${type}] ${msg}`);
    }
});