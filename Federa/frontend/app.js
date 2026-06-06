// Federa前端应用逻辑
document.addEventListener('DOMContentLoaded', () => {
    // 导航逻辑
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 移除所有链接和区域的活动状态
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => {
                s.classList.add('hidden');
                s.classList.remove('active');
            });
            
            // 为点击的链接和目标区域添加活动状态
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                targetSection.classList.add('active');
            }
        });
    });

    // 钱包连接功能
    const connectWalletBtn = document.getElementById('connect-wallet');
    const walletStatus = document.getElementById('wallet-status');
    const accountShort = document.getElementById('account-short');
    const balance = document.getElementById('balance');
    const disconnectWalletBtn = document.getElementById('disconnect-wallet');

    connectWalletBtn.addEventListener('click', async () => {
        try {
            // 检查MetaMask是否存在
            if (typeof window.ethereum !== 'undefined') {
                // 请求账户权限
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const account = accounts[0];
                
                // 获取账户余额
                const balanceWei = await window.ethereum.request({
                    method: 'eth_getBalance',
                    params: [account, 'latest']
                });
                
                // 使用 ethers.js 工具转换余额，如果没有则手动转换
                let balanceEth;
                if (typeof window.ethers !== 'undefined' && window.ethers.utils) {
                    balanceEth = parseFloat(window.ethers.utils.formatEther(balanceWei)).toFixed(4);
                } else {
                    // 手动转换 wei 到 ether (除以 10^18)
                    const balanceBigNumber = BigInt(balanceWei);
                    const balanceString = balanceBigNumber.toString();
                    // 在字符串中插入小数点（从右边数18位）
                    let paddedBalance = balanceString.padStart(18, '0');
                    const integerPart = paddedBalance.slice(0, Math.max(0, paddedBalance.length - 18)) || '0';
                    const decimalPart = paddedBalance.slice(Math.max(0, paddedBalance.length - 18)).replace(/0+$/, '') || '0';
                    balanceEth = integerPart + '.' + decimalPart;
                    if (balanceEth.startsWith('.')) balanceEth = '0' + balanceEth;
                    balanceEth = parseFloat(balanceEth).toFixed(4);
                }
                
                // 更新UI
                connectWalletBtn.classList.add('hidden');
                walletStatus.classList.remove('hidden');
                
                accountShort.textContent = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
                balance.textContent = `${balanceEth} ETH`;
                
                // 添加活动日志
                addActivity('钱包已连接', '刚刚');
                
                console.log('钱包连接成功:', account);
            } else {
                alert('请安装MetaMask钱包插件');
            }
        } catch (error) {
            console.error('钱包连接失败:', error);
            alert('钱包连接失败: ' + error.message);
        }
    });

    // 断开钱包连接功能
    if (disconnectWalletBtn) {
        disconnectWalletBtn.addEventListener('click', () => {
            connectWalletBtn.classList.remove('hidden');
            walletStatus.classList.add('hidden');
            
            // 添加活动日志
            addActivity('钱包已断开连接', '刚刚');
        });
    }

    // 表单切换功能
    setupFormToggle('register-node-btn', 'node-reg-form');
    setupFormToggle('create-task-btn', 'task-create-form');
    setupFormToggle('mint-nft-btn', 'nft-create-form');
    setupFormToggle('register-dataset-btn', 'dataset-reg-form');

    function setupFormToggle(btnId, formId) {
        const btn = document.getElementById(btnId);
        const form = document.getElementById(formId);
        if (btn && form) {
            btn.addEventListener('click', () => {
                form.classList.toggle('hidden');
            });
        }
    }

    // 初始化图表
    initCharts();

    function initCharts() {
        // 检查Chart.js是否已加载
        if (typeof Chart === 'undefined') {
            console.error('Chart.js未加载');
            return;
        }

        // 节点分布图表
        const nodeCtx = document.getElementById('nodeChart');
        if (nodeCtx) {
            new Chart(nodeCtx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['训练节点', '聚合节点', '数据提供者'],
                    datasets: [{
                        data: [12, 5, 8],
                        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // 任务状态图表
        const taskCtx = document.getElementById('taskChart');
        if (taskCtx) {
            new Chart(taskCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['待开始', '进行中', '已完成', '失败'],
                    datasets: [{
                        label: '任务数量',
                        data: [5, 12, 28, 3],
                        backgroundColor: '#818cf8',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                display: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        }

        // 活动趋势图表
        const activityCtx = document.getElementById('activityChart');
        if (activityCtx) {
            new Chart(activityCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                    datasets: [{
                        label: '活跃节点',
                        data: [65, 59, 80, 81, 56, 95, 110],
                        borderColor: '#4f46e5',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(79, 70, 229, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#f3f4f6'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    }
                }
            });
        }

        // 信誉分分布图表
        const repCtx = document.getElementById('reputationChart');
        if (repCtx) {
            new Chart(repCtx.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: ['高信誉 (>80)', '中信誉 (50-80)', '低信誉 (<50)'],
                    datasets: [{
                        data: [45, 30, 25],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    }

    // 添加活动日志
    function addActivity(text, time) {
        const feed = document.getElementById('activity-feed');
        if (feed) {
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="activity-content">
                    <p>${text}</p>
                    <small>${time}</small>
                </div>
            `;
            feed.prepend(item);
        }
    }

    // 智能合约交互功能
    setupContractInteractions();

    function setupContractInteractions() {
        // 节点注册功能
        const submitNodeRegBtn = document.getElementById('submit-node-reg');
        if (submitNodeRegBtn) {
            submitNodeRegBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const nodeType = document.getElementById('node-type').value;
                const nodeStake = parseFloat(document.getElementById('node-stake').value);
                
                if (!nodeStake || nodeStake <= 0) {
                    alert('请输入有效的质押金额');
                    return;
                }
                
                try {
                    // 显示加载状态
                    const originalText = submitNodeRegBtn.textContent;
                    submitNodeRegBtn.disabled = true;
                    submitNodeRegBtn.textContent = '处理中...';
                    
                    // 模拟合约调用
                    await simulateContractCall('registerNode', { nodeType, stake: nodeStake });
                    
                    // 添加活动日志
                    addActivity(`${nodeType}节点注册成功`, '刚刚');
                    
                    // 隐藏表单
                    document.getElementById('node-reg-form').classList.add('hidden');
                    
                    alert(`成功注册${nodeType}节点！质押金额：${nodeStake} FED`);
                    
                    // 恢复按钮状态
                    submitNodeRegBtn.disabled = false;
                    submitNodeRegBtn.textContent = originalText;
                } catch (error) {
                    console.error('节点注册失败:', error);
                    alert('节点注册失败: ' + error.message);
                    submitNodeRegBtn.disabled = false;
                    submitNodeRegBtn.textContent = '注册节点';
                }
            });
        }

        // 任务创建功能
        const submitTaskCreateBtn = document.getElementById('submit-task-create');
        if (submitTaskCreateBtn) {
            submitTaskCreateBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const taskName = document.getElementById('task-name').value;
                const taskReward = parseFloat(document.getElementById('task-reward').value);
                const taskRounds = parseInt(document.getElementById('task-rounds').value);
                const taskDescription = document.getElementById('task-description').value;
                
                if (!taskName) {
                    alert('请输入任务名称');
                    return;
                }
                
                if (!taskReward || taskReward <= 0) {
                    alert('请输入有效的奖励池金额');
                    return;
                }
                
                if (!taskRounds || taskRounds <= 0) {
                    alert('请输入有效的训练轮次');
                    return;
                }
                
                try {
                    // 显示加载状态
                    const originalText = submitTaskCreateBtn.textContent;
                    submitTaskCreateBtn.disabled = true;
                    submitTaskCreateBtn.textContent = '创建中...';
                    
                    // 模拟合约调用
                    await simulateContractCall('createTask', { 
                        name: taskName, 
                        reward: taskReward,
                        rounds: taskRounds,
                        description: taskDescription
                    });
                    
                    // 添加活动日志
                    addActivity(`任务"${taskName}"创建成功`, '刚刚');
                    
                    // 隐藏表单
                    document.getElementById('task-create-form').classList.add('hidden');
                    
                    alert(`成功创建任务"${taskName}"！奖励池：${taskReward} FED，轮次：${taskRounds}`);
                    
                    // 恢复按钮状态
                    submitTaskCreateBtn.disabled = false;
                    submitTaskCreateBtn.textContent = originalText;
                } catch (error) {
                    console.error('任务创建失败:', error);
                    alert('任务创建失败: ' + error.message);
                    submitTaskCreateBtn.disabled = false;
                    submitTaskCreateBtn.textContent = '创建任务';
                }
            });
        }

        // NFT铸造功能
        const submitNftMintBtn = document.getElementById('submit-nft-mint');
        if (submitNftMintBtn) {
            submitNftMintBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const nftName = document.getElementById('nft-name').value;
                const nftDescription = document.getElementById('nft-description').value;
                const nftModelUri = document.getElementById('nft-model-uri').value;
                const nftPerformance = document.getElementById('nft-performance').value;
                
                if (!nftName) {
                    alert('请输入NFT名称');
                    return;
                }
                
                try {
                    // 显示加载状态
                    const originalText = submitNftMintBtn.textContent;
                    submitNftMintBtn.disabled = true;
                    submitNftMintBtn.textContent = '铸造中...';
                    
                    // 模拟合约调用
                    await simulateContractCall('mintModelNFT', { 
                        name: nftName, 
                        description: nftDescription,
                        modelUri: nftModelUri,
                        performance: nftPerformance
                    });
                    
                    // 添加活动日志
                    addActivity(`模型NFT"${nftName}"铸造成功`, '刚刚');
                    
                    // 隐藏表单
                    document.getElementById('nft-create-form').classList.add('hidden');
                    
                    alert(`成功铸造NFT"${nftName}"！`);
                    
                    // 恢复按钮状态
                    submitNftMintBtn.disabled = false;
                    submitNftMintBtn.textContent = originalText;
                } catch (error) {
                    console.error('NFT铸造失败:', error);
                    alert('NFT铸造失败: ' + error.message);
                    submitNftMintBtn.disabled = false;
                    submitNftMintBtn.textContent = '铸造NFT';
                }
            });
        }

        // 数据集注册功能
        const submitDatasetRegBtn = document.getElementById('submit-dataset-reg');
        if (submitDatasetRegBtn) {
            submitDatasetRegBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const datasetName = document.getElementById('dataset-name').value;
                const datasetDescription = document.getElementById('dataset-description').value;
                const datasetSize = document.getElementById('dataset-size').value;
                const datasetFormat = document.getElementById('dataset-format').value;
                
                if (!datasetName) {
                    alert('请输入数据集名称');
                    return;
                }
                
                try {
                    // 显示加载状态
                    const originalText = submitDatasetRegBtn.textContent;
                    submitDatasetRegBtn.disabled = true;
                    submitDatasetRegBtn.textContent = '注册中...';
                    
                    // 模拟合约调用
                    await simulateContractCall('registerDataset', { 
                        name: datasetName, 
                        description: datasetDescription,
                        size: datasetSize,
                        format: datasetFormat
                    });
                    
                    // 添加活动日志
                    addActivity(`数据集"${datasetName}"注册成功`, '刚刚');
                    
                    // 隐藏表单
                    document.getElementById('dataset-reg-form').classList.add('hidden');
                    
                    alert(`成功注册数据集"${datasetName}"！`);
                    
                    // 恢复按钮状态
                    submitDatasetRegBtn.disabled = false;
                    submitDatasetRegBtn.textContent = originalText;
                } catch (error) {
                    console.error('数据集注册失败:', error);
                    alert('数据集注册失败: ' + error.message);
                    submitDatasetRegBtn.disabled = false;
                    submitDatasetRegBtn.textContent = '注册数据集';
                }
            });
        }
    }

    // 模拟合约调用
    async function simulateContractCall(method, params) {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 模拟合约交互
        console.log(`调用合约方法: ${method}`, params);
        
        // 模拟成功响应
        return { success: true, txHash: `0x${Math.random().toString(16).substr(2, 64)}` };
    }

    // 更新仪表板统计
    function updateDashboardStats() {
        // 模拟从合约获取统计数据
        const totalNodesElement = document.getElementById('total-nodes');
        const totalTasksElement = document.getElementById('total-tasks');
        const totalNftsElement = document.getElementById('total-nfts');
        const totalDatasetsElement = document.getElementById('total-datasets');
        
        if (totalNodesElement) totalNodesElement.textContent = '25';
        if (totalTasksElement) totalTasksElement.textContent = '17';
        if (totalNftsElement) totalNftsElement.textContent = '8';
        if (totalDatasetsElement) totalDatasetsElement.textContent = '12';
    }

    // 初始化时更新统计数据
    updateDashboardStats();
    
    // 定期更新统计数据
    setInterval(updateDashboardStats, 30000); // 每30秒更新一次
    
    // 初始化Ethers.js（如果未定义）
    if (typeof window.ethers === 'undefined') {
        console.warn('Ethers.js未加载，请检查CDN链接');
    }
});