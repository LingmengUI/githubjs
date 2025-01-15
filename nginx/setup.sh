#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'


if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}请使用 root 权限运行此脚本${NC}"
  exit 1
fi


SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"


if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
else
    echo -e "${RED}找不到 .env 文件${NC}"
    exit 1
fi


if [ -z "$NEXT_PUBLIC_DOMAIN" ]; then
    echo -e "${RED}请在 .env 文件中设置 NEXT_PUBLIC_DOMAIN${NC}"
    exit 1
fi


DOMAIN=$(echo $NEXT_PUBLIC_DOMAIN | sed 's/https\?:\/\///')

echo -e "${BLUE}开始配置 Nginx...${NC}"


if ! command -v nginx &> /dev/null; then
    echo -e "${BLUE}Nginx 未安装，开始安装...${NC}"
    apt update
    apt install -y nginx
fi


echo -e "${BLUE}创建 Nginx 配置文件...${NC}"
NGINX_CONF="/etc/nginx/conf.d/$DOMAIN.conf"


cat "$SCRIPT_DIR/template.conf" | \
    sed "s|{{domain}}|$DOMAIN|g" | \
    sed "s|{{project_path}}|$PROJECT_DIR|g" \
    > "$NGINX_CONF"


echo -e "${BLUE}设置文件权限...${NC}"
chmod -R 755 "$PROJECT_DIR/.next"
chmod -R 755 "$PROJECT_DIR/public"


NGINX_USER=$(ps aux | grep -E '[n]ginx.*master' | awk '{print $1}' | head -n1)
if [ -z "$NGINX_USER" ]; then
    NGINX_USER="www-data"
fi


chown -R $NGINX_USER:$NGINX_USER "$PROJECT_DIR/.next"
chown -R $NGINX_USER:$NGINX_USER "$PROJECT_DIR/public"


echo -e "${BLUE}测试 Nginx 配置...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    
    echo -e "${BLUE}重启 Nginx...${NC}"
    systemctl restart nginx
    echo -e "${GREEN}Nginx 配置完成！${NC}"
    echo -e "${GREEN}现在可以通过 $NEXT_PUBLIC_DOMAIN 访问您的网站${NC}"
else
    echo -e "${RED}Nginx 配置测试失败${NC}"
    exit 1
fi 