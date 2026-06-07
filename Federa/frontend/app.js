// Federa Frontend Logic - High-End Optimized
document.addEventListener('DOMContentLoaded', () => {
    // === 1. Navigation Logic ===
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.add('hidden'));
            
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
            }
        });
    });

    // === 2. Global Toast Notifications ===
    window.showToast = function(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('closing');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // === 3. Wallet Connection ===
    const connectWalletBtn = document.getElementById('connect-wallet');
    const walletStatus = document.getElementById('wallet-status');
    const accountShort = document.getElementById('account-short');
    const balanceText = document.getElementById('balance');
    const disconnectWalletBtn = document.getElementById('disconnect-wallet');

    window.currentAccount = null; // 暴露给其他脚本

    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', async () => {
            if (typeof ethers === 'undefined') {
                showToast('Ethers.js library not loaded', 'error');
                return;
            }

            if (window.ethereum) {
                try {
                    connectWalletBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
                    connectWalletBtn.disabled = true;

                    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                    window.currentAccount = accounts[0];
                    
                    const provider = new ethers.providers.Web3Provider(window.ethereum);
                    const balanceWei = await provider.getBalance(window.currentAccount);
                    const balanceEth = parseFloat(ethers.utils.formatEther(balanceWei)).toFixed(4);
                    
                    connectWalletBtn.classList.add('hidden');
                    walletStatus.classList.remove('hidden');
                    
                    accountShort.textContent = `${window.currentAccount.substring(0, 6)}...${window.currentAccount.slice(-4)}`;
                    balanceText.textContent = `${balanceEth} ETH`;
                    
                    addActivity('Wallet connected successfully', 'Just now');
                    showToast('Wallet connected', 'success');

                    // 检查是否为聚合节点（示例地址）
                    const aggregatorDemoAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
                    const aggregatorPanel = document.getElementById('aggregator-panel');
                    if (aggregatorPanel && window.currentAccount.toLowerCase() === aggregatorDemoAddress.toLowerCase()) {
                        aggregatorPanel.classList.remove('hidden');
                        showToast('检测到聚合节点角色，聚合面板已解锁', 'info');
                    }
                } catch (error) {
                    showToast('Connection failed', 'error');
                } finally {
                    connectWalletBtn.disabled = false;
                    connectWalletBtn.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
                }
            } else {
                showToast('Please install MetaMask', 'warning');
            }
        });
    }

    if (disconnectWalletBtn) {
        disconnectWalletBtn.addEventListener('click', () => {
            window.currentAccount = null;
            connectWalletBtn.classList.remove('hidden');
            walletStatus.classList.add('hidden');
            addActivity('Wallet disconnected', 'Just now');
            showToast('Wallet disconnected', 'info');
            const aggregatorPanel = document.getElementById('aggregator-panel');
            if (aggregatorPanel) aggregatorPanel.classList.add('hidden');
        });
    }

    // === 4. Form Toggles ===
    function setupToggle(btnId, formId) {
        const btn = document.getElementById(btnId);
        const form = document.getElementById(formId);
        if (btn && form) {
            btn.addEventListener('click', () => form.classList.toggle('hidden'));
        }
    }
    setupToggle('register-node-btn', 'node-reg-form');
    setupToggle('create-task-btn', 'task-create-form');
    setupToggle('mint-nft-btn', 'nft-create-form');
    setupToggle('register-dataset-btn', 'dataset-reg-form');

    // === 5. Chart Initialization ===
    function initCharts() {
        if (typeof Chart === 'undefined') return;
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 } } }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
                x: { grid: { display: false }, ticks: { color: '#64748b' } }
            }
        };
        const activityCtx = document.getElementById('activityChart');
        if (activityCtx) {
            new Chart(activityCtx, {
                type: 'line',
                data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'], datasets: [{ label: 'Average Shapley Value', data: [0.12, 0.19, 0.15, 0.25, 0.22, 0.31, 0.28], borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)', fill: true, tension: 0.4 }] },
                options: commonOptions
            });
        }
        const nodeCtx = document.getElementById('nodeChart');
        if (nodeCtx) {
            new Chart(nodeCtx, { type: 'doughnut', data: { labels: ['Trainer', 'Aggregator', 'Data Provider'], datasets: [{ data: [65, 15, 20], backgroundColor: ['#6366f1', '#a855f7', '#3b82f6'], borderWidth: 0, hoverOffset: 10 }] }, options: { ...commonOptions, cutout: '70%' } });
        }
        const taskCtx = document.getElementById('taskChart');
        if (taskCtx) {
            new Chart(taskCtx, { type: 'bar', data: { labels: ['Pending', 'Training', 'Completed', 'Failed'], datasets: [{ label: 'Tasks', data: [12, 24, 45, 3], backgroundColor: '#6366f1', borderRadius: 6 }] }, options: commonOptions });
        }
        const repCtx = document.getElementById('reputationChart');
        if (repCtx) {
            new Chart(repCtx, { type: 'pie', data: { labels: ['High', 'Medium', 'Low'], datasets: [{ data: [70, 20, 10], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 0 }] }, options: commonOptions });
        }
    }
    setTimeout(initCharts, 500);

    // === 6. Activity Logger ===
    window.addActivity = function(text, time) {
        const feed = document.getElementById('activity-feed');
        if (feed) {
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `<div class="activity-icon"><i class="fas fa-circle-info"></i></div><div class="activity-content"><p style="font-weight: 600;">${text}</p><small style="color: var(--text-muted);">${time}</small></div>`;
            feed.prepend(item);
        }
    };

    // === 7. 模拟链上交易（挂载到 window，供 training.js 调用）===
    window.simulateTransaction = async function(actionName, params = {}) {
        if (!window.currentAccount) {
            showToast('Please connect wallet first', 'warning');
            throw new Error('Wallet not connected');
        }
        const txHash = '0x' + Math.random().toString(36).substring(2, 15);
        showToast(`${actionName} 交易已发送: ${txHash.substring(0, 10)}...`, 'info');
        await new Promise(resolve => setTimeout(resolve, 2000));
        showToast(`${actionName} 交易已确认`, 'success');
        return txHash;
    };

    // === 8. 动态添加卡片函数 ===
    function addNodeCard(role, stake, address = '0x'+Math.random().toString(36).substring(2,10)) {
        const container = document.getElementById('nodes-list');
        if (!container) return;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <div class="stat-icon" style="margin-bottom: 0;"><i class="fas fa-microchip"></i></div>
                <span class="badge" style="background: var(--success); color: #fff; font-size: 0.7rem; padding: 4px 8px; border-radius: 6px;">ACTIVE</span>
            </div>
            <h4 style="font-size: 1.2rem; margin-bottom: 0.5rem;">${escapeHtml(role)}</h4>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">ID: ${address.substring(0,6)}...${address.slice(-4)}</p>
            <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
                <div><small style="display: block; color: var(--text-muted);">信誉评分</small><strong style="color: var(--accent-primary);">100 / 100</strong></div>
                <div><small style="display: block; color: var(--text-muted);">质押金额</small><strong>${stake} FED</strong></div>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-secondary btn-sm node-detail-btn" style="flex: 1;">详情</button>
                <button class="btn btn-secondary btn-sm node-withdraw-btn" style="flex: 1;">提取收益</button>
            </div>
        `;
        container.prepend(card);
        // 绑定详情和提取收益按钮事件
        card.querySelector('.node-detail-btn').addEventListener('click', () => {
            showToast(`节点详情: ${role}，信誉100，质押${stake} FED`, 'info');
        });
        card.querySelector('.node-withdraw-btn').addEventListener('click', async () => {
            if (!window.currentAccount) return showToast('请先连接钱包', 'warning');
            showToast(`正在提取收益...`, 'info');
            await new Promise(r => setTimeout(r, 1000));
            showToast(`已提取 50 FED 收益`, 'success');
            addActivity(`从 ${role} 提取收益 50 FED`, 'Just now');
        });
    }

    function addTaskCard(name, reward, rounds) {
        const container = document.getElementById('tasks-list');
        if (!container) return;
        const taskId = Date.now().toString().slice(-8);
        const card = document.createElement('div');
        card.className = 'item-card';
        card.setAttribute('data-task-id', taskId);
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                <span class="badge" style="background: rgba(99, 102, 241, 0.2); color: var(--accent-primary); padding: 5px 10px; border-radius: 8px;">新任务</span>
                <span style="color: var(--text-muted); font-size: 0.8rem;">#${taskId}</span>
            </div>
            <h4 style="font-size: 1.25rem; margin-bottom: 0.75rem;">${escapeHtml(name)}</h4>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">基于 Federa 协议的零知识联邦训练任务。</p>
            <div style="background: var(--bg-surface); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;"><small>训练进度</small><small class="task-progress-text">0 / ${rounds} 轮</small></div>
                <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px;">
                    <div class="task-progress-bar" style="width: 0%; height: 100%; background: var(--accent-primary); border-radius: 3px;"></div>
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div><small style="display: block; color: var(--text-muted);">奖池总额</small><strong style="font-size: 1.1rem; color: var(--success);">${reward} FED</strong></div>
                <button class="btn btn-primary btn-sm join-task-btn" data-task-name="${escapeHtml(name)}">参与训练</button>
            </div>
        `;
        container.prepend(card);
        card.querySelector('.join-task-btn').addEventListener('click', () => {
            if (!window.currentAccount) return showToast('请先连接钱包', 'warning');
            showToast(`已加入任务 ${name}，请前往训练工作台`, 'success');
            addActivity(`参与任务 ${name}`, 'Just now');
            document.querySelector('.nav-link[data-target="training"]').click();
        });
        // 存储任务信息以便后续更新进度（可选）
        if (!window.tasksProgress) window.tasksProgress = {};
        window.tasksProgress[taskId] = { current: 0, total: parseInt(rounds), name: name };
    }

    function addNFTCard(name) {
        const container = document.getElementById('nfts-list');
        if (!container) return;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.style.padding = '0';
        card.style.overflow = 'hidden';
        card.innerHTML = `
            <div style="height: 200px; background: linear-gradient(45deg, #1e1e26, #2d2d3a); display: flex; align-items: center; justify-content: center; position: relative;">
                <i class="fas fa-cube" style="font-size: 5rem; color: var(--accent-secondary); opacity: 0.5;"></i>
                <div style="position: absolute; bottom: 1rem; left: 1rem; background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 6px; backdrop-filter: blur(4px);"><small>新铸造</small></div>
            </div>
            <div style="padding: 1.5rem;">
                <h4 style="font-size: 1.2rem; margin-bottom: 0.5rem;">${escapeHtml(name)}</h4>
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                    <span style="color: var(--text-muted); font-size: 0.85rem;">准确率: 待验证</span>
                    <span style="color: var(--success); font-weight: 700;">-- ETH</span>
                </div>
                <hr style="border: 0; border-top: 1px solid var(--divider); margin-bottom: 1rem;">
                <button class="btn btn-secondary btn-sm download-model-btn" style="width: 100%;">下载模型权重 (IPFS)</button>
            </div>
        `;
        container.prepend(card);
        card.querySelector('.download-model-btn').addEventListener('click', () => {
            showToast(`正在从 IPFS 下载 ${name} 权重...`, 'info');
            setTimeout(() => {
                showToast(`下载链接: ipfs://QmExample/${name.replace(/\s/g, '_')}.bin (模拟)`, 'success');
                addActivity(`下载模型 ${name}`, 'Just now');
            }, 1000);
        });
    }

    function addDatasetCard(name) {
        const container = document.getElementById('datasets-list');
        if (!container) return;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 1.5rem;">
                <div class="stat-icon" style="margin-bottom: 0; background: rgba(59, 130, 246, 0.1); color: var(--info);"><i class="fas fa-database"></i></div>
                <div><h4 style="font-size: 1.1rem;">${escapeHtml(name)}</h4><small style="color: var(--text-muted);">分类: 自定义数据集</small></div>
            </div>
            <div style="background: var(--bg-surface); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;"><small style="color: var(--text-muted);">访问策略</small><span class="badge" style="background: rgba(59, 130, 246, 0.2); color: var(--info);">需授权</span></div>
                <div style="display: flex; justify-content: space-between;"><small style="color: var(--text-muted);">数据条数</small><strong>待定</strong></div>
            </div>
            <button class="btn btn-primary btn-sm request-access-btn" style="width: 100%;">申请访问权限</button>
        `;
        container.prepend(card);
        card.querySelector('.request-access-btn').addEventListener('click', () => {
            if (!window.currentAccount) return showToast('请先连接钱包', 'warning');
            showToast('访问申请已提交，等待数据提供者审批（链上事件）', 'info');
            addActivity(`申请数据集 ${name} 访问权限`, 'Just now');
            // 模拟后续：2秒后提示审批通过
            setTimeout(() => {
                showToast(`数据提供者已批准您访问 ${name}，访问密钥已发放`, 'success');
                addActivity(`数据集 ${name} 访问权限已批准`, 'Just now');
            }, 4000);
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // === 9. 表单提交逻辑（带动态添加卡片） ===
    // 注册节点
    const submitNodeBtn = document.getElementById('submit-node');
    if (submitNodeBtn) {
        submitNodeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!window.currentAccount) return showToast('请先连接钱包', 'warning');
            const roleSelect = document.getElementById('node-role');
            const role = roleSelect.options[roleSelect.selectedIndex].text;
            const stake = document.getElementById('stake-amount').value;
            if (!stake || stake < 200) {
                showToast('质押金额不能小于 200 FED', 'error');
                return;
            }
            submitNodeBtn.disabled = true;
            submitNodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
            try {
                await window.simulateTransaction(`注册节点 - ${role}，质押 ${stake} FED`);
                addActivity(`节点注册成功: ${role}`, 'Just now');
                addNodeCard(role, stake, window.currentAccount);
                document.getElementById('node-reg-form').classList.add('hidden');
                showToast('节点已添加到列表', 'success');
            } catch (err) {}
            finally {
                submitNodeBtn.disabled = false;
                submitNodeBtn.innerHTML = '提交链上注册';
            }
        });
    }

    // 创建任务
    const submitTaskBtn = document.getElementById('submit-task');
    if (submitTaskBtn) {
        submitTaskBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!window.currentAccount) return showToast('请先连接钱包', 'warning');
            const taskName = document.getElementById('task-name').value;
            const rewardPool = document.getElementById('reward-pool').value;
            const targetRounds = document.getElementById('target-rounds').value;
            if (!taskName || !rewardPool || !targetRounds) {
                showToast('请填写完整任务信息', 'error');
                return;
            }
            submitTaskBtn.disabled = true;
            submitTaskBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 部署中...';
            try {
                await window.simulateTransaction(`创建任务 ${taskName}`);
                addActivity(`任务 "${taskName}" 已创建，奖池 ${rewardPool} FED`, 'Just now');
                addTaskCard(taskName, rewardPool, targetRounds);
                document.getElementById('task-create-form').classList.add('hidden');
                showToast('新任务已添加到市场', 'success');
            } finally {
                submitTaskBtn.disabled = false;
                submitTaskBtn.innerHTML = '部署智能合约';
            }
        });
    }

    // 铸造 NFT
    const submitNftBtn = document.getElementById('submit-nft');
    if (submitNftBtn) {
        submitNftBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!window.currentAccount) return showToast('请先连接钱包', 'warning');
            const nftName = document.getElementById('nft-name').value;
            if (!nftName) {
                showToast('请输入资产名称', 'error');
                return;
            }
            submitNftBtn.disabled = true;
            submitNftBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 铸造中...';
            try {
                await window.simulateTransaction(`铸造模型 NFT: ${nftName}`);
                addActivity(`模型 NFT "${nftName}" 铸造成功`, 'Just now');
                addNFTCard(nftName);
                document.getElementById('nft-create-form').classList.add('hidden');
                showToast('新 NFT 已添加到画廊', 'success');
            } finally {
                submitNftBtn.disabled = false;
                submitNftBtn.innerHTML = '发起铸造';
            }
        });
    }

    // 登记数据集
    const submitDatasetBtn = document.getElementById('submit-dataset');
    if (submitDatasetBtn) {
        submitDatasetBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!window.currentAccount) return showToast('请先连接钱包', 'warning');
            const datasetName = document.getElementById('dataset-name').value;
            if (!datasetName) {
                showToast('请输入数据集名称', 'error');
                return;
            }
            submitDatasetBtn.disabled = true;
            submitDatasetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 生成承诺...';
            try {
                await window.simulateTransaction(`登记数据集: ${datasetName}`);
                addActivity(`数据集 "${datasetName}" 已登记 Merkle 承诺`, 'Just now');
                addDatasetCard(datasetName);
                document.getElementById('dataset-reg-form').classList.add('hidden');
                showToast('新数据集已添加到枢纽', 'success');
            } finally {
                submitDatasetBtn.disabled = false;
                submitDatasetBtn.innerHTML = '生成 Merkle 承诺并上链';
            }
        });
    }

    // === 10. 静态页面中的按钮绑定 ===
    // 节点管理静态卡片的详情和提取收益
    const staticNodeDetailBtn = document.querySelector('#nodes-list .item-card:first-child .node-detail-btn');
    const staticNodeWithdrawBtn = document.querySelector('#nodes-list .item-card:first-child .node-withdraw-btn');
    if (staticNodeDetailBtn) {
        staticNodeDetailBtn.addEventListener('click', () => {
            showToast('主训练节点 #01 详情: 信誉98.4，累计奖励1420 FED', 'info');
        });
    }
    if (staticNodeWithdrawBtn) {
        staticNodeWithdrawBtn.addEventListener('click', async () => {
            if (!window.currentAccount) return showToast('请先连接钱包', 'warning');
            showToast('正在提取收益...', 'info');
            await new Promise(r => setTimeout(r, 1000));
            showToast('已提取 100 FED 收益', 'success');
            addActivity('从主训练节点提取收益 100 FED', 'Just now');
        });
    }

    // 静态任务卡片的参与训练
    const staticJoinBtn = document.querySelector('#tasks-list .item-card:first-child .join-task-btn');
    if (staticJoinBtn) {
        staticJoinBtn.addEventListener('click', () => {
            if (!window.currentAccount) return showToast('请先连接钱包', 'warning');
            showToast('已加入任务 MNIST 隐私保护分类器，请前往训练工作台', 'success');
            addActivity('参与任务 MNIST 隐私保护分类器', 'Just now');
            document.querySelector('.nav-link[data-target="training"]').click();
        });
    }

    // 静态 NFT 卡片的下载按钮
    const staticDownloadBtn = document.querySelector('#nfts-list .item-card:first-child .download-model-btn');
    if (staticDownloadBtn) {
        staticDownloadBtn.addEventListener('click', () => {
            showToast('正在从 IPFS 下载 ResNet-50 肺部诊断 v2 权重...', 'info');
            setTimeout(() => {
                showToast('下载链接: ipfs://QmExample/ResNet50_Lung_v2.bin (模拟)', 'success');
                addActivity('下载模型权重 ResNet-50 肺部诊断 v2', 'Just now');
            }, 1000);
        });
    }

    // 静态数据集卡片的申请访问权限
    const staticRequestBtn = document.querySelector('#datasets-list .item-card:first-child .request-access-btn');
    if (staticRequestBtn) {
        staticRequestBtn.addEventListener('click', () => {
            if (!window.currentAccount) return showToast('请先连接钱包', 'warning');
            showToast('访问申请已提交，等待数据提供者审批（链上事件）', 'info');
            addActivity('申请 MIMIC-IV 临床数据库访问权限', 'Just now');
            setTimeout(() => {
                showToast('数据提供者已批准您的访问申请，访问密钥已发放', 'success');
                addActivity('MIMIC-IV 临床数据库访问权限已批准', 'Just now');
            }, 4000);
        });
    }
});