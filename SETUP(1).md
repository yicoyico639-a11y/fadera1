# Federa — 从零部署指南

本文档描述如何在一台干净电脑上从 GitHub 克隆并完整运行 Federa 项目。

***

## 1. 环境要求

| 工具                    | 版本   | 用途                                    |
| :-------------------- | :--- | :------------------------------------ |
| Node.js               | ≥ 18 | 前端开发                                  |
| pnpm                  | 最新   | 前端包管理                                 |
| Git                   | 任意   | 克隆仓库                                  |
| Foundry (forge, cast) | 最新   | 合约编译/部署/测试                            |
| WSL2 + Ubuntu         | 最新   | ZK 证明生成 (仅 Windows 需要，Mac/Linux 原生支持) |
| Rust + RISC Zero      | 见下方  | ZK 证明编译                               |
| MetaMask 浏览器插件        | 最新   | 钱包连接                                  |

***

## 2. 克隆仓库

```bash
git clone https://github.com/YYYYYCanYue/--.git
cd --
```

***

## 3. 安装前端依赖

```bash
cd frontend
pnpm install
```

***

## 4. 配置环境变量

### 4.1 前端 `.env`（可选）

前端合约地址硬编码在 `src/app/services/contracts.ts` 中，需额配置重新部署后的合约即可运行。

如需自定义，复制模板：

```bash
cp frontend/.env.example frontend/.env
```

### 4.1.1 IPFS 存储（可选，推荐）

IPFS 用于存储完整的模型文件（初始模型、聚合后的新模型）。不配置也能运行，但模型哈希将使用 SHA-256 而非 IPFS CID。

1. 注册 [Pinata](https://pinata.cloud)（免费 1GB）
2. API Keys → New Key → 复制 JWT
3. 在前端 `.env` 中添加：

```env
VITE_PINATA_JWT=你的Pinata JWT
VITE_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

配置后，上传模型时自动存入 IPFS，返回 CID（内容标识符）。任何人都可通过 CID 在 IPFS 网关下载完整模型文件：

```
https://gateway.pinata.cloud/ipfs/<CID>
```

### 4.2 合约 `.env`（部署必需）

```bash
cp contracts/.env.example contracts/.env
```

填入以下内容：

```env
ETHEREUM_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=你的以太坊私钥 (0x开头)
ETHERSCAN_API_KEY=你的Etherscan API密钥 (合约验证用，可选)
ZK_VERIFIER_ADDRESS=RISC Zero Groth16验证器地址
IMAGE_ID=Guest程序镜像ID
```

> `ZK_VERIFIER_ADDRESS` 和 `IMAGE_ID` 从 RISC Zero 编译输出获取（见第 7 步）。

***

## 5. 安装 Foundry（合约工具链）

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

***

## 6. 部署合约到以太坊 Sepolia 测试网

```bash
cd contracts

# 编译
forge build

# 运行测试
forge test

# 部署
source ../.env
forge script script/Deploy.s.sol --rpc-url ethereum_sepolia --broadcast
```

部署后会输出合约地址。更新 `frontend/src/app/services/contracts.ts` 中的地址。

***

## 7. 编译 ZK 证明程序（RISC Zero zkVM）

### 7.1 Mac / Linux环境，windows请看下一步（7.2）

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# 安装 RISC Zero 工具链
curl -L https://risczero.com/install | bash
source ~/.bashrc
rzup install

# 编译 guest + host
cd zk-prover
cargo +risc0 build --release
```

### 7.2 Windows（需要 WSL2 Ubuntu）

> **为什么需要 WSL？** RISC Zero zkVM 编译器只支持 Linux，Windows 上必须通过 WSL2 运行。

#### 7.2.1 安装 WSL2

```powershell
# PowerShell 管理员
wsl --install -d Ubuntu
```

重启电脑后，开始菜单搜索 "Ubuntu" 打开，首次启动会提示创建用户名和密码。

验证安装：

```powershell
wsl --list --verbose
# 应显示: Ubuntu  Running  2
```

#### 7.2.2 WSL 中安装 Rust + RISC Zero

打开 Ubuntu 终端：

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env

# 安装 RISC Zero 工具链
curl -L https://risczero.com/install | bash
source ~/.bashrc
rzup install
```

#### 7.2.3 编译 zk-prover

```bash
# 从 Windows 文件系统复制项目到 WSL（避免跨文件系统编译问题）
cp -r /mnt/c/Users/你的用户名/Desktop/--/zk-prover ~/zk-prover
cd ~/zk-prover

# 首次编译需要较长时间（下载依赖）
cargo +risc0 build --release
```

> **注意**：必须在 WSL Linux 文件系统（`~/`）下编译，不能直接在 `/mnt/c/` 下编译，否则会因文件系统差异导致错误。

#### 7.2.4 提取镜像 ID

编译成功后：

```bash
grep GUEST_ID target/release/build/methods-*/out/methods.rs
# 输出示例: pub const GUEST_ID: [u32; 8] = [2468580457, 1824664214, ...];
```

将 8 个 u32 值拼接为 hex，填入 `contracts/.env` 的 `IMAGE_ID`。

#### 7.2.5 WSL 常见问题

| 问题                                 | 解决                                                                |
| :--------------------------------- | :---------------------------------------------------------------- |
| `wsl: 检测到 localhost 代理`            | 管理员 PowerShell: `netsh winhttp reset proxy`                       |
| 下载 crate 超时                        | `sudo bash -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'`     |
| `risc0-circuit-recursion` zip 验证失败 | 手动下载 zip 放到 `target/release/build/risc0-circuit-recursion-*/out/` |
| 编译时找不到 `cc`                        | `sudo apt-get update && sudo apt-get install -y build-essential`  |
| 找不到 `rustup`                       | `source ~/.cargo/env`（每次新终端需要）                                    |

将输出的 `[u32; 8]` 数组转换为 hex，填入 `contracts/.env` 的 `IMAGE_ID`。

***

## 8. 启动 ZK Prover 服务

```bash
cd ~/zk-prover
./target/release/host
```

保持运行，输出应显示 `Listening on http://0.0.0.0:8080`。

验证：`curl http://127.0.0.1:8080/health` 返回 `{"status":"ok"}`。

***

## 9. 启动前端

```bash
cd frontend
pnpm dev
```

浏览器打开 `http://localhost:5173`。

***

## 10. 获取测试代币

| 代币                | 获取方式                                                 |
| :---------------- | :--------------------------------------------------- |
| Sepolia ETH (Gas) | [sepoliafaucet.com](https://sepoliafaucet.com)       |
| FED 测试代币          | 部署者调用 `FederaToken.mint(你的地址, 数量)`，或在前端使用已预置余额的部署者钱包 |

***

## 11. 演示流程

```
1. MetaMask 连接 → 选择 Sepolia 网络
2. 侧边栏点击「Create Task」→ 上传模型文件 → 配置参数 → 部署
3. 顶部下拉菜单选择刚创建的任务
4. Dashboard → 点击「开始轮次 1」
5. Trainer Node → 质押 FED → Train & Prove → 提交梯度
6. Aggregator → 聚合 → 结束轮次（自动开启下一轮）
7. Leaderboard 查看贡献排名
8. Event Log 查看实时事件
9. Model Gallery 查看模型版本 NFT
```

***

## 故障排查

| 问题                             | 解决                                                            |
| :----------------------------- | :------------------------------------------------------------ |
| MetaMask gas 费过高               | 手动设置 Gas：Max base fee 5 GWEI, Priority fee 1 GWEI             |
| `intrinsic gas too low`        | 刷新前端（最新版已加大 gas limit）                                        |
| `ERR_CONNECTION_REFUSED :8080` | zk-prover 未启动，执行第 8 步                                         |
| `413 Payload Too Large`        | 刷新前端（已减小 mock 数据量）                                            |
| `insufficient funds`           | 去 sepoliafaucet.com 领测试 ETH                                   |
| WSL 下载超时                       | `sudo bash -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'` |

