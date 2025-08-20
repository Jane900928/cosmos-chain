#!/bin/bash

# Cosmos 区块链应用安装和启动脚本
# 使用方法: ./scripts/setup.sh

set -e

echo "🚀 Cosmos 区块链应用安装脚本"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 未安装，请先安装 $1"
        return 1
    else
        print_message "$1 已安装 ✅"
        return 0
    fi
}

# 检查系统要求
check_requirements() {
    print_step "检查系统要求..."
    
    # 检查 Node.js
    if check_command "node"; then
        NODE_VERSION=$(node -v)
        print_message "Node.js 版本: $NODE_VERSION"
    else
        print_error "请安装 Node.js 16.x 或更高版本"
        exit 1
    fi
    
    # 检查 npm
    if check_command "npm"; then
        NPM_VERSION=$(npm -v)
        print_message "npm 版本: $NPM_VERSION"
    else
        print_error "npm 未找到"
        exit 1
    fi
    
    # 检查 git
    if check_command "git"; then
        GIT_VERSION=$(git --version)
        print_message "Git 已安装"
    else
        print_warning "Git 未安装，但不是必需的"
    fi
    
    echo ""
}

# 安装 Ignite CLI
install_ignite() {
    print_step "检查 Ignite CLI..."
    
    if command -v ignite &> /dev/null; then
        IGNITE_VERSION=$(ignite version)
        print_message "Ignite CLI 已安装: $IGNITE_VERSION"
    else
        print_warning "Ignite CLI 未安装，正在安装..."
        curl -s https://get.ignite.com/cli! | bash
        
        # 添加到 PATH
        export PATH=$PATH:$(go env GOPATH)/bin
        
        if command -v ignite &> /dev/null; then
            print_message "Ignite CLI 安装成功 ✅"
        else
            print_error "Ignite CLI 安装失败"
            print_message "请手动安装: curl https://get.ignite.com/cli! | bash"
            exit 1
        fi
    fi
    echo ""
}

# 创建 Cosmos 链
setup_cosmos_chain() {
    print_step "设置 Cosmos 区块链..."
    
    CHAIN_DIR="test-chain"
    
    if [ -d "$CHAIN_DIR" ]; then
        print_warning "目录 $CHAIN_DIR 已存在"
        read -p "是否删除现有链并重新创建? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf $CHAIN_DIR
            print_message "已删除现有链目录"
        else
            print_message "使用现有链目录"
            return 0
        fi
    fi
    
    if [ ! -d "$CHAIN_DIR" ]; then
        print_message "创建新的 Cosmos 链..."
        ignite scaffold chain $CHAIN_DIR
        print_message "Cosmos 链创建成功 ✅"
    fi
    
    echo ""
}

# 安装项目依赖
install_dependencies() {
    print_step "安装项目依赖..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json 文件未找到，请确保在正确的项目目录中运行此脚本"
        exit 1
    fi
    
    print_message "安装 npm 依赖..."
    npm install
    
    if [ $? -eq 0 ]; then
        print_message "依赖安装成功 ✅"
    else
        print_error "依赖安装失败"
        exit 1
    fi
    
    echo ""
}

# 创建环境配置
setup_environment() {
    print_step "设置环境配置..."
    
    if [ ! -f ".env" ]; then
        print_message "创建 .env 文件..."
        cat > .env << EOF
# 服务器配置
PORT=3000

# Cosmos 区块链配置
RPC_ENDPOINT=http://localhost:26657
CHAIN_ID=test-chain
ADDRESS_PREFIX=cosmos

# API 配置
API_BASE_URL=http://localhost:3000/api

# 开发配置
NODE_ENV=development
DEBUG=true
EOF
        print_message ".env 文件创建成功 ✅"
    else
        print_message ".env 文件已存在 ✅"
    fi
    
    # 创建数据目录
    if [ ! -d "data" ]; then
        mkdir -p data
        print_message "数据目录创建成功 ✅"
    else
        print_message "数据目录已存在 ✅"
    fi
    
    echo ""
}

# 启动 Cosmos 链
start_cosmos_chain() {
    print_step "启动 Cosmos 区块链..."
    
    if [ ! -d "test-chain" ]; then
        print_error "Cosmos 链目录不存在，请先运行链设置"
        return 1
    fi
    
    print_message "在后台启动 Cosmos 链..."
    cd test-chain
    
    # 检查是否已在运行
    if curl -s http://localhost:26657/status > /dev/null 2>&1; then
        print_message "Cosmos 链已在运行 ✅"
        cd ..
        return 0
    fi
    
    # 启动链
    print_message "启动 ignite chain serve..."
    nohup ignite chain serve > ../cosmos-chain.log 2>&1 &
    CHAIN_PID=$!
    echo $CHAIN_PID > ../cosmos-chain.pid
    
    cd ..
    
    # 等待链启动
    print_message "等待 Cosmos 链启动..."
    for i in {1..30}; do
        if curl -s http://localhost:26657/status > /dev/null 2>&1; then
            print_message "Cosmos 链启动成功 ✅"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    
    print_error "Cosmos 链启动超时"
    print_message "请检查日志: tail -f cosmos-chain.log"
    return 1
}

# 启动应用
start_application() {
    print_step "启动区块链应用..."
    
    # 检查 Cosmos 链是否运行
    if ! curl -s http://localhost:26657/status > /dev/null 2>&1; then
        print_warning "Cosmos 链未运行，尝试启动..."
        start_cosmos_chain
        if [ $? -ne 0 ]; then
            print_error "无法启动 Cosmos 链"
            return 1
        fi
    fi
    
    print_message "启动 Express 应用..."
    print_message "应用将在 http://localhost:3000 运行"
    print_message "区块链浏览器: http://localhost:3000"
    print_message ""
    print_message "按 Ctrl+C 停止应用"
    print_message ""
    
    npm start
}

# 显示使用说明
show_usage() {
    cat << EOF
使用方法:
  $0 [选项]

选项:
  install     - 安装所有依赖和设置环境
  start-chain - 启动 Cosmos 区块链
  start-app   - 启动应用服务器
  start       - 启动完整系统（链 + 应用）
  stop        - 停止所有服务
  status      - 检查服务状态
  help        - 显示此帮助信息

示例:
  $0 install     # 首次安装
  $0 start       # 启动完整系统
  $0 stop        # 停止所有服务
EOF
}

# 停止服务
stop_services() {
    print_step "停止服务..."
    
    # 停止应用
    pkill -f "node.*server.js" || true
    
    # 停止 Cosmos 链
    if [ -f "cosmos-chain.pid" ]; then
        CHAIN_PID=$(cat cosmos-chain.pid)
        if kill -0 $CHAIN_PID 2>/dev/null; then
            kill $CHAIN_PID
            print_message "Cosmos 链已停止"
        fi
        rm -f cosmos-chain.pid
    fi
    
    # 停止 ignite 进程
    pkill -f "ignite.*serve" || true
    
    print_message "所有服务已停止 ✅"
}

# 检查服务状态
check_status() {
    print_step "检查服务状态..."
    
    # 检查 Cosmos 链
    if curl -s http://localhost:26657/status > /dev/null 2>&1; then
        print_message "Cosmos 链: 运行中 ✅"
    else
        print_warning "Cosmos 链: 未运行 ❌"
    fi
    
    # 检查应用
    if curl -s http://localhost:3000/api/blockchain/status > /dev/null 2>&1; then
        print_message "应用服务器: 运行中 ✅"
    else
        print_warning "应用服务器: 未运行 ❌"
    fi
}

# 主函数
main() {
    case "${1:-install}" in
        "install")
            check_requirements
            install_ignite
            install_dependencies
            setup_environment
            setup_cosmos_chain
            print_message ""
            print_message "安装完成! 🎉"
            print_message "运行 '$0 start' 启动系统"
            ;;
        "start-chain")
            start_cosmos_chain
            ;;
        "start-app")
            start_application
            ;;
        "start")
            start_cosmos_chain
            sleep 5
            start_application
            ;;
        "stop")
            stop_services
            ;;
        "status")
            check_status
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "未知选项: $1"
            show_usage
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"