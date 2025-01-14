# GitHub 文件加速下载服务

一个基于 Next.js 开发的 GitHub 文件加速下载服务，支持多节点加速、留言互动等功能。
![项目截图](screenshots/preview.png)
## 功能特点

- 🚀 多节点自动测速
- 💬 用户留言与回复
- 👨‍💼 管理员后台管理
- 📌 重要留言置顶
- 🎨 美观的用户界面
- 🔒 安全的管理员验证

## 技术栈

- Next.js 15.1.4
- React 19
- TypeScript
- Tailwind CSS
- MySQL
- PM2

## 环境要求

- Node.js 20+
- MySQL 8.0+

## 快速开始

1. 克隆项目/或者直接下载安装包
```bash
git clone https://github.com/LingmengUI/githubjs.git
cd githubjs
```

2. 配置环境变量/如何配置在下面
```bash
将env.example文件名改成.env

# 编辑 .env 文件，填入你的配置
```

3. 服务器部署进入项目终端执行/部署好之后访问http://你的服务器ip:3999即可，访问不了是你的端口没放行
```bash
./deploy.sh
```

4. 初始化数据库/去网页执行/到这一步服务器部署教程结束
```bash
# 访问此接口创建数据库表
http://你的服务器ip:3999/api/setup
```

5. 下面是开发环境运行
安装依赖
```bash
npm install
```

6. 然后执行下面命令/执行完之后用这个网址访问即可http://localhost:3000/
```bash
npm run dev
```

## 环境变量说明

```env
# 加速节点配置/已经配置好，无需改动
NEXT_PUBLIC_PROXY_NODES=node1.example.com,node2.example.com

# 数据库配置/换成自己的数据库
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_username
DB_USER=your_username
DB_PASSWORD=your_password

# 管理员配置/管理员入口的密码
NEXT_PUBLIC_ADMIN_PASSWORD=your_admin_password
```

## 部署说明

项目使用 PM2 进行进程管理，部署脚本会自动：

1. 检查环境依赖
2. 安装必要组件
3. 构建项目
4. 启动服务
5. 配置开机自启

常用命令：
```bash
# 查看运行状态
pm2 status

# 查看日志
pm2 logs githubjs

# 重启服务
pm2 restart githubjs

# 停止服务
pm2 stop githubjs
```

## 目录结构

```
githubjs/
├── src/
│   ├── app/                # Next.js 应用目录
│   │   ├── api/           # API 路由
│   │   └── page.tsx       # 主页面
│   ├── components/        # 通用组件
│   └── lib/              # 工具函数
├── public/               # 静态资源
├── deploy.sh            # 部署脚本
└── .env                # 环境变量
```

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进项目。

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎提交 Issue 或通过以下方式联系：

- Email: 362856178@qq.com
- QQ：362856178
