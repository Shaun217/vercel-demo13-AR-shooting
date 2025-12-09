# Bauhaus Air Sorter - Dark Edition

一个基于Web的AR隔空取物游戏，采用了暗色系的包豪斯设计风格。

## 特点
- **手势交互**: 通过摄像头追踪手部，捏合手指抓取和拖拽物体。
- **暗色UI**: 全新的暗色毛玻璃风格界面，沉浸感更强。
- **中心布局**: 3D物体和目标盒子居中排列，符合视觉习惯。
- **音效反馈**: 成功的分类会有清脆的音效。
- **多人循环**: 支持多人轮流游玩并记录成绩。

## 如何运行

由于浏览器安全策略，本项目必须在本地服务器环境下运行以调用摄像头。

### 方法 1: 使用 VS Code (推荐)
1.  确保安装了 [Visual Studio Code](https://code.visualstudio.com/)。
2.  在 VS Code 中安装 **Live Server** 扩展。
3.  用 VS Code 打开包含这 4 个文件的文件夹。
4.  右键点击 `index.html`，选择 "Open with Live Server"。

### 方法 2: 使用 Python
1.  打开命令行或终端。
2.  进入包含这 4 个文件的目录。
3.  运行 `python -m http.server` (Python 3) 或 `python -m SimpleHTTPServer` (Python 2)。
4.  在浏览器访问 `http://localhost:8000`。

## 文件结构
- `index.html`: 页面结构
- `style.css`: 样式定义
- `script.js`: 游戏逻辑、3D渲染和手势识别
- `README.md`: 说明文档