
# 🚀InfiniTownTS
ThreeJS主页无限城市项目的TypeScript开源版，基本上复制了原版无限城市的精妙算法，加强了相机控制和动画，小车交互，场景旋转等功能，并使用了最新的ThreeJS引擎版本。

[访问原版ThreeJS原版无限城市](https://demos.littleworkshop.fr/infinitown)

## 🌐 在线演示
[🔗点击访问TS开源版无限城市](https://osoker.github.io/InfiniTownTS/)

## 📥 安装说明

### 1️⃣ 克隆代码

```bash
git clone https://github.com/osoker/InfiniTownTS.git
cd InfiniTownTS
```

### 2️⃣ 安装依赖

```bash
npm install
```

### 3️⃣ 启动开发服务器

```bash
npm run dev
```

### 4️⃣ 构建生产版本

```bash
npm run build
```

构建后的文件位于 `dist/` 目录下，可直接部署到静态服务器或 GitHub Pages。

---

## 🧭 项目结构

```
InfiniTownTS/
├── docs/              # GitHub Pages 使用的静态网页
├── dist/              # 构建输出目录
├── src/               # TypeScript 源码
│   ├── core/          # 城市算法核心逻辑
│   └── main.ts        # 入口文件
├── public/            # 静态资源
├── package.json
└── README.md
```

---

## 🛠️ 技术栈

- [Three.js](https://threejs.org/)：WebGL 渲染引擎
- [TypeScript](https://www.typescriptlang.org/)：强类型 JS 超集
- [TWEEN.js](https://github.com/tweenjs/tween.js)：动画插值库

---

## 📌 特性亮点

- ✨ 无限城市算法，动态加载与卸载城市块
- 🧭 相机轨迹控制与聚焦点控制（支持 OrbitControls）
- 🔧 TypeScript类结构，更容易弄懂无限城市的原理。


## 💬 CallMe

- 📮 邮箱：osoker008@gmail.com
