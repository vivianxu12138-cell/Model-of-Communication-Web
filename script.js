gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
// =================================================
// 1. 通用工具函数：放在文件最上面，不要动它
// =================================================
function applyMatrixEntrance(targetSelector, isFalling = true) {
    const element = document.querySelector(targetSelector);
    if (!element) return;

    // 尝试获取子元素
    let children = element.querySelectorAll("path, circle, rect, polygon, line, text, g");
    // 如果子元素太多，只取第一层，避免性能卡顿
    if (children.length > 50) children = element.children;

    const distance = isFalling ? -100 : 100;

    if (children.length > 0) {
        gsap.from(children, {
            y: distance,
            opacity: 0,
            duration: 1,
            stagger: { amount: 1, from: "random" },
            ease: "power2.out",
            scrollTrigger: {
                trigger: element,
                start: "top 80%",
                end: "bottom 60%",
                scrub: 1
            }
        });
    } else {
        gsap.from(element, {
            y: distance,
            opacity: 0,
            duration: 1,
            ease: "power2.out",
            scrollTrigger: {
                trigger: element,
                start: "top 85%",
                scrub: 1
            }
        });
    }
}

window.onload = function() {
    gsap.to("#loader", { opacity: 0, duration: 0.5 });

    // ======================================
    // 0. 全局设置
    // ======================================
    // 让 GSAP 知道整个页面多长
    const docHeight = document.querySelector("svg").getBoundingClientRect().height;
    
    // 主时间轴：控制小球和连线
    const mainTimeline = gsap.timeline({
        scrollTrigger: {
            trigger: "body", // 整个文档
            start: "top top",
            end: "bottom bottom",
            scrub: 1.5, // 增加延迟，让动作更顺滑
        }
    });

    // 1. 小球运动 (核心)
    mainTimeline.to("#DATA-PAR", {
        motionPath: {
            path: "#motion-path",
            align: "#motion-path",
            alignOrigin: [0.5, 0.5],
            autoRotate: true
        },
        ease: "power1.inOut", // 这种缓动更高级，起步慢中间快
        duration: 10
    });

    // ======================================
    // Fancy 特效 1：连线自动描绘 (模拟 DrawSVG)
    // ======================================
    // 选中所有连接线 (假设它们是 path 或者是 rect/line)
    // 这里我们用一个小技巧：让页面里所有的 path 在进入视口时“画”出来
    const allPaths = document.querySelectorAll("path");
    allPaths.forEach(path => {
        // 跳过小球和辅助线
        if(path.id === "motion-path" || path.id.includes("DATA")) return;

        // 获取线条长度
        const length = path.getTotalLength ? path.getTotalLength() : 1000;
        
        // 只有当线条够长（像是连接线）时才应用动画
        if(length > 50) {
            gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
            gsap.to(path, {
                strokeDashoffset: 0,
                duration: 1.5,
                scrollTrigger: {
                    trigger: path,
                    start: "top 80%", // 当线条进入屏幕 80% 处开始画
                    end: "bottom 60%",
                    scrub: 1
                }
            });
        }
    });

  // =================================================
// 5. CHANNEL: 完美闭环版 (动画后自动复原)
// =================================================

applyMatrixEntrance("#CHANNEL");

if (document.querySelector("#CHANNEL")) {
    const channel = document.querySelector("#CHANNEL");
    gsap.set(channel, { cursor: "pointer" });

    channel.addEventListener("click", () => {
        
        // === 1. 精准筛选元件 (保持不变) ===
        const allPaths = Array.from(channel.querySelectorAll("path"));
        const waves = allPaths.filter(el => {
            const style = getComputedStyle(el);
            const bounds = el.getBoundingClientRect();
            return bounds.width > 80 && (style.fill === "none" || style.fill === "transparent");
        });

        const allRects = Array.from(channel.querySelectorAll("rect"));
        const purpleSquares = allRects.filter(el => {
            const w = parseFloat(el.getAttribute("width")) || parseFloat(getComputedStyle(el).width) || 0;
            return w < 25 && w > 0; 
        });

        const allShapes = Array.from(channel.querySelectorAll("circle, ellipse, rect"));
        const buttons = allShapes.filter(el => {
            const w = parseFloat(el.getAttribute("width")) || parseFloat(getComputedStyle(el).width) || 0;
            const r = parseFloat(el.getAttribute("r")) || 0;
            const rx = parseFloat(el.getAttribute("rx")) || 0;
            const isSmallDecoration = (w > 0 && w < 25);
            const isBackground = (r > 100 || rx > 100 || w > 300);
            return !isSmallDecoration && !isBackground;
        });


        // === 2. 动画时间轴 ===
        const tl = gsap.timeline({
            // 【关键修复】：整个动画结束后，强制清除所有内联样式
            // 这样波浪线就会变回实线，方块也会回到原位
            onComplete: () => {
                gsap.set(waves, { strokeDasharray: "none", strokeDashoffset: 0, scaleY: 1, clearProps: "strokeDasharray,strokeDashoffset" });
            }
        });

        // --- A. 波浪线：流动 + 起伏 ---
        if (waves.length > 0) {
            // 1. 信号流动 (虚线跑动)
            waves.forEach(wave => {
                const len = wave.getTotalLength();
                // 使用 fromTo 确保每次点击都从头开始跑
                tl.fromTo(wave, 
                    { strokeDasharray: `50, ${len}`, strokeDashoffset: len }, 
                    { strokeDashoffset: -len, duration: 1.5, ease: "none" },
                    0 // 插入时间轴起点
                );
            });

            // 2. 形变呼吸 (幅度变化)
            tl.to(waves, {
                scaleY: 1.3, // 稍微拉高
                duration: 0.25,
                ease: "sine.inOut",
                transformOrigin: "center center",
                yoyo: true,
                repeat: 3 // 上下起伏 3 次
            }, 0);
        }

        // --- B. 紫色小方块：跳走再跳回 ---
        if (purpleSquares.length > 0) {
            // 1. 跳走
            tl.to(purpleSquares, {
                x: () => gsap.utils.random(-30, 30),
                y: () => gsap.utils.random(-30, 30),
                rotation: 90,
                duration: 0.4,
                ease: "back.out(2)",
                stagger: 0.1
            }, 0);

            // 2. 归位 (Wait & Return)
            tl.to(purpleSquares, {
                x: 0,
                y: 0,
                rotation: 0,
                duration: 0.5,
                ease: "power2.out"
            }, 1.0); // 在 1.0秒的时候（动画快结束时）归位
        }

        // --- C. 节点按钮：按压回弹 ---
        // scale 动画不需要特殊处理，因为它本身就是 1 -> 0.85 -> 1
        if (buttons.length > 0) {
            tl.to(buttons, {
                scale: 0.85, 
                duration: 0.1,
                ease: "power2.in",
                transformOrigin: "center center", 
                stagger: { amount: 0.3, grid: "auto", from: "center" }
            }, 0)
            .to(buttons, {
                scale: 1, 
                duration: 0.4,
                ease: "elastic.out(1, 0.3)",
                stagger: { amount: 0.3, grid: "auto", from: "center" }
            }, 0.1);
        }
    });
}

// =====================================================
    // 第一阶段：SOURCE (信源) - 混沌与脉冲
    // =====================================================
    
    const sourceGroup = document.querySelector("#SOURCE"); // 确保你 AI 里组名叫 SOURCE
    
    

    // 2. 交互：点击触发脉冲 + 发射几何粒子
    if(sourceGroup) {
        // 设置鼠标手势
        sourceGroup.style.cursor = "pointer";

        sourceGroup.addEventListener("click", (e) => {
            // (A) 本体脉冲效果
            gsap.to("#SOURCE", { scale: 1.1, duration: 0.1, yoyo: true, repeat: 1 });

            // (B) 动态生成粒子发射效果
            createBurstParticles(e.clientX, e.clientY);
        });
        
        
    }

    // 粒子生成函数
    function createBurstParticles(x, y) {
        // 创建 5 个临时的小图形
        for(let i=0; i<5; i++) {
            const el = document.createElement("div");
            el.style.position = "fixed";
            el.style.left = x + "px";
            el.style.top = y + "px";
            el.style.width = "10px";
            el.style.height = "10px";
            el.style.backgroundColor = ["red", "blue", "black"][Math.floor(Math.random()*3)]; // 随机颜色
            // 随机形状：圆或方
            el.style.borderRadius = Math.random() > 0.5 ? "50%" : "0"; 
            document.body.appendChild(el);

            // 炸开动画
            gsap.to(el, {
                x: (Math.random() - 0.5) * 300, // 随机飞散
                y: (Math.random() - 0.5) * 300,
                opacity: 0,
                duration: 1,
                onComplete: () => el.remove() // 动画完删掉，不占内存
            });
        }
    }



// =================================================
// 6. RECEIVER: 箭头重绘 & 手风琴 (稳妥复原版)
// =================================================

applyMatrixEntrance("#RECEIVER");

if (document.querySelector("#RECEIVER")) {
    const receiver = document.querySelector("#RECEIVER");
    gsap.set(receiver, { cursor: "pointer" });

    receiver.addEventListener("click", () => {
        
        // === 1. 视觉特征识别 ===
        const svgBounds = receiver.getBoundingClientRect();
        const allShapes = Array.from(receiver.querySelectorAll("path, rect, polygon, line, circle, ellipse"));
        
        // 辅助判断
        const hasFill = (el) => {
            const style = getComputedStyle(el);
            return style.fill && style.fill !== "none" && style.fill !== "transparent";
        };

        let bigArrow = null;
        const accordionBars = []; 

        // A. 找大箭头 (最长的线)
        const lines = allShapes.filter(el => !hasFill(el) && el.tagName !== "circle");
        if (lines.length > 0) {
            // 按长度排序
            bigArrow = lines.sort((a, b) => (b.getTotalLength?.() || 0) - (a.getTotalLength?.() || 0))[0];
        }

        // B. 找手风琴 (有填充、竖长、位于下半部)
        allShapes.forEach(el => {
            if (el === bigArrow) return;
            const b = el.getBoundingClientRect();
            const centerY = (b.top - svgBounds.top) + b.height/2;

            if (hasFill(el) && b.height > b.width * 1.5 && centerY > svgBounds.height * 0.4) {
                accordionBars.push(el);
            }
        });

        // === 2. 动画时间轴 ===
        const tl = gsap.timeline({
            // 【核心修复】：动画彻底结束后，清除所有内联样式，强制回到原始状态
            onComplete: () => {
                gsap.set([...accordionBars, bigArrow], { clearProps: "all" });
            }
        });

        // --- 动效一：大箭头路径重绘 (Draw Path) ---
        if (bigArrow) {
            const len = bigArrow.getTotalLength();
            
            // 1. 瞬间把线条“藏”起来 (设为虚线，虚线长度=总长，偏移量=总长)
            // 2. 然后慢慢把偏移量归零，线就画出来了
            tl.fromTo(bigArrow, 
                { 
                    strokeDasharray: len, 
                    strokeDashoffset: len,
                    opacity: 1
                },
                { 
                    strokeDashoffset: 0, 
                    duration: 0.8, 
                    ease: "power2.inOut"
                },
                0 // 立即开始
            );
        }

        // --- 动效二：手风琴效果 (Accordion) ---
        if (accordionBars.length > 0) {
            // 1. 挤压 (Squeeze)
            tl.to(accordionBars, {
                scaleX: 0.1, 
                transformOrigin: "center center",
                duration: 0.2,
                ease: "power2.in",
                stagger: { amount: 0.1, from: "center" }
            }, 0); // 和箭头同时开始

            // 2. 展开 (Expand) - 带有弹性
            tl.to(accordionBars, {
                scaleX: 1, 
                duration: 1.2,
                ease: "elastic.out(1, 0.3)", // Q弹复位
                stagger: { amount: 0.2, from: "center" }
            }, 0.2);
        }
    });
}


   // =================================================
// 2. NOISE 交互：点击描绘路径 (Draw Paths)
// =================================================

applyMatrixEntrance("#NOISE"); 

const noiseEl = document.querySelector("#NOISE");

if(noiseEl) {
    // 设置鼠标手型
    noiseEl.style.cursor = "pointer";

    // A. 预处理：找到 Noise 里面所有的线条 (Path)
    // 这种效果最适合 stroke (描边) 风格的图形
    const noisePaths = noiseEl.querySelectorAll("path, line, polyline, rect, circle");

    // B. 点击事件
    noiseEl.addEventListener("click", () => {
        
        // 第一步：先让所有线条“隐身” (重置状态)
        noisePaths.forEach(path => {
            // 获取线条总长度 (如果是矩形等图形，粗略计算周长)
            const length = path.getTotalLength ? path.getTotalLength() : 200;
            
            // 核心原理：把虚线间隔设为全长，并偏移出去，线条就看不见了
            gsap.set(path, { 
                strokeDasharray: length, 
                strokeDashoffset: length,
                opacity: 1 // 确保它是显示的，只是被 offset 藏住了
            });
        });

        // 第二步：执行“描绘”动画
        gsap.to(noisePaths, {
            strokeDashoffset: 0, // 偏移量归零，线条显现
            duration: 1.5,       // 1.5秒画完
            ease: "power2.inOut", // 起步慢，中间快，结束慢
            stagger: {
                amount: 0.5,      // 稍微错开一点时间画，更有层次感
                from: "random"    // 随机顺序画，不要太死板
            },
            // 可选：画的过程中让线条闪烁一下颜色，更有故障感
            onStart: () => {
                gsap.to(noiseEl, { scale: 0.98, duration: 0.2, yoyo: true, repeat: 1 });
            }
        });

        // 第三步：如果你想要填充色(Fill)最后才出来
        // 先把所有填充变透明，画完线再填色
        gsap.fromTo(noisePaths, 
            { fillOpacity: 0 }, 
            { fillOpacity: 1, duration: 1, delay: 1.2 }
        );
        
        // 配合你的文字弹窗逻辑 (如果有)
        // showModal("NOISE", "路径重绘中..."); 
    });
}

};

// =================================================
// 4. DECODER: 精准控制版 (只闪小方块 + 球归位 + 字重写)
// =================================================

applyMatrixEntrance("#DECODER");

if (document.querySelector("#DECODER")) {
    const decoder = document.querySelector("#DECODER");
    gsap.set(decoder, { cursor: "pointer" });

    decoder.addEventListener("click", () => {
        
        // === 1. 精准筛选元件 (核心修改) ===

        // A. 筛选“多宫格”：只选小的正方形，排除长条和背景
        const allRects = Array.from(decoder.querySelectorAll("rect"));
        const gridCells = allRects.filter(el => {
            // 获取宽度和高度 (如果没有属性就去算样式)
            const w = parseFloat(el.getAttribute("width")) || parseFloat(getComputedStyle(el).width) || 0;
            const h = parseFloat(el.getAttribute("height")) || parseFloat(getComputedStyle(el).height) || 0;
            
            // 【过滤规则】：宽度小于60 且 高度小于60 的才是格子
            // 这样就能避开那些长长的装饰条了
            return w < 60 && h < 60 && w > 5; 
        });

        // B. 筛选小球：只选小圆，排除大背景圆
        const allCircles = Array.from(decoder.querySelectorAll("circle"));
        const smallBalls = allCircles.filter(el => {
            const r = parseFloat(el.getAttribute("r")) || parseFloat(getComputedStyle(el).width)/2 || 0;
            return r < 30; // 半径小于30的才是球
        });

        // C. 路径：用于写字
        const paths = decoder.querySelectorAll("path");


        // === 2. 动画时间轴 ===
        const tl = gsap.timeline();

        // --- 步骤一：只有小格子频闪 ---
        if (gridCells.length > 0) {
            tl.to(gridCells, {
                duration: 0.4, 
                opacity: 0.2, // 变暗
                stagger: {
                    amount: 0.3, 
                    from: "random",
                    repeat: 3, // 闪3次
                    yoyo: true
                },
                ease: "power1.inOut"
            });
        }

        // --- 步骤二：小球强制归位后滚出 ---
        if (smallBalls.length > 0) {
            tl.fromTo(smallBalls, 
                { x: 0, rotation: 0 }, // 强制回到原点
                {
                    x: 40,         // 滚出距离
                    rotation: 360,
                    duration: 0.8,
                    stagger: 0.1,
                    ease: "back.out(1.5)"
                }, 
                gridCells.length > 0 ? "<" : "+=0" // 紧接着格子动画
            );
        }

        // --- 步骤三：文字重写 ---
        if (paths.length > 0) {
            tl.fromTo(paths, 
                { 
                    strokeDasharray: 600, 
                    strokeDashoffset: 600,
                    opacity: 1 
                },
                {
                    strokeDashoffset: 0,
                    duration: 1.2,
                    ease: "power2.out",
                    stagger: 0.05
                }, 
                0 // 从点击一开始就重写，不等待
            );
        }
    });
}

// Fancy 的彩带爆炸效果
function spawnConfetti(x, y) {
    const colors = ["#FF0000", "#0000FF", "#000000", "#FFFFFF"];
    for(let i=0; i<20; i++) {
        const div = document.createElement("div");
        div.style.cssText = `position:fixed; left:${x}px; top:${y}px; width:${Math.random()*10+5}px; height:${Math.random()*5+2}px; background:${colors[i%4]}; pointer-events:none; z-index:999;`;
        document.body.appendChild(div);
        
        // 物理抛物线效果
        gsap.to(div, {
            x: (Math.random()-0.5) * 300,
            y: (Math.random()-0.5) * 300,
            rotation: Math.random()*720,
            opacity: 0,
            duration: 1.5,
            ease: "power2.out",
            onComplete: () => div.remove()
        });
    }
}

// 2. ENCODER: 激光数据传输与机械咬合

applyMatrixEntrance("#ENCODER"); 

if (document.querySelector("#ENCODER")) {
    const encoder = document.querySelector("#ENCODER");

    // === A. 智能识别元件 ===
    // 我们需要精准找到：红按钮、粗线、绿齿轮、线圈
    const allElements = encoder.querySelectorAll("*");
    
    let redBtn = null;
    let thickLine = null;
    let greenGear = null;
    let coil = null;
    let maxStroke = 0;

    allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const fill = style.fill;
        const stroke = style.stroke;
        const strokeW = parseFloat(style.strokeWidth) || 0;
        
        // 1. 找红按钮 (通常是圆或路径)
        if (!redBtn && (fill === "rgb(255, 0, 0)" || fill === "#ff0000" || fill.includes("red"))) {
            redBtn = el;
        }

        // 2. 找最粗的线 (你的核心需求)
        if (el.tagName !== "g" && stroke !== "none" && strokeW > maxStroke && strokeW < 30) {
            maxStroke = strokeW;
            thickLine = el;
        }

        // 3. 找绿色部件 (齿轮)
        if (!greenGear && (fill.includes("green") || fill === "#008000" || fill === "#4cd964")) {
            greenGear = el;
        }

        // 4. 找线圈 (长路径且卷曲)
        if (!coil && el.getTotalLength && el.getTotalLength() > 300) {
            coil = el; // 假设最长的那个路径是线圈
        }
    });

    // === B. 初始化状态 (静止) ===
    // 关键点：我们需要把那根粗线变成“虚线模式”，以便做光束动画
    // 但一开始看起来要是实线，所以 dasharray 设为极大
    if (thickLine) {
        const len = thickLine.getTotalLength();
        // 初始状态：实线
        gsap.set(thickLine, { 
            strokeDasharray: "none",
            strokeLinecap: "round" // 让端点圆润一点，更好看
        });
    }

    gsap.set(encoder, { transformOrigin: "center center", cursor: "pointer" });


    // === C. 点击交互：机械运作流程 ===
    encoder.addEventListener("click", (e) => {
        // 1. 生成二进制代码 (010101) 飘升效果
        spawnBinaryCode(e.clientX, e.clientY);

        const tl = gsap.timeline();

        // --- 步骤 1: 红色按钮按压 (Input) ---
        if (redBtn) {
            tl.to(redBtn, {
                scale: 0.8,
                transformOrigin: "center center",
                duration: 0.1,
                ease: "power2.in"
            })
            .to(redBtn, {
                scale: 1,
                duration: 0.2,
                ease: "back.out(3)" // 强力回弹
            });
        }

        // --- 步骤 2: 粗线变成激光光束 (Transmission) ---
        // 这是最独特的部分：模拟电流流过
        if (thickLine) {
            const len = thickLine.getTotalLength();
            
            // 瞬间切换成亮色 + 虚线
            tl.to(thickLine, {
                stroke: "#39ff14", // 霓虹绿 (激光色)
                strokeWidth: "+=2",
                strokeDasharray: `${len * 0.3} ${len}`, // 创造一段“光束”，后面是空白
                strokeDashoffset: len, // 初始位置：光束在起点之前
                duration: 0, // 瞬间发生
            }, "<") // 和按钮回弹同时开始
            
            // 光束飞速划过
            .to(thickLine, {
                strokeDashoffset: -len, // 光束跑到终点之后
                duration: 0.4,
                ease: "power1.inOut" // 线性匀速划过
            })
            
            // 恢复原状
            .to(thickLine, {
                stroke: "", // 恢复原色 (移除内联样式)
                strokeWidth: "-=2",
                strokeDasharray: "none", // 变回实线
                duration: 0.1
            });
        }

        // --- 步骤 3: 绿色齿轮“咬合” (Processing) ---
        // 不是旋转，而是像钳子一样收缩一下
        if (greenGear) {
            // 在光束划过一半时触发
            tl.to(greenGear, {
                scale: 0.6, // 瞬间缩小 (咬合)
                rotation: 15, // 稍微歪一点
                duration: 0.05,
                ease: "power1.in"
            }, "-=0.3")
            .to(greenGear, {
                scale: 1, // 弹回
                rotation: 0,
                duration: 0.3,
                ease: "elastic.out(1, 0.5)"
            });
        }

        // --- 步骤 4: 线圈高频震动 + 磁场 (Encoding) ---
        if (coil) {
            // 震动效果 (像手机震动模式)
            tl.to(coil, {
                x: 2, // 左右快速抖动
                duration: 0.05,
                repeat: 5, // 抖5次
                yoyo: true,
                ease: "sine.inOut"
            }, "-=0.2"); // 在光束到达末端时震动

            // 视觉增强：让线圈发光
            tl.fromTo(coil, 
                { filter: "drop-shadow(0px 0px 0px rgba(0,122,255,0))" },
                { filter: "drop-shadow(0px 0px 10px rgba(0,122,255,0.8))", duration: 0.1, repeat: 1, yoyo: true },
                "<"
            );
        }
    });
}


// === 专属特效：二进制代码浮动 ===
function spawnBinaryCode(x, y) {
    const count = 15; // 代码数量
    
    for (let i = 0; i < count; i++) {
        const span = document.createElement("div");
        span.innerText = Math.random() > 0.5 ? "1" : "0"; // 随机生成 0 或 1
        document.body.appendChild(span);

        // 样式设置
        gsap.set(span, {
            position: "fixed",
            left: x + (Math.random() * 60 - 30), // 在点击位置附近
            top: y,
            color: "#39ff14", // 黑客帝国绿，或者用 "#000"
            fontFamily: "monospace", // 等宽字体，像代码
            fontWeight: "bold",
            fontSize: Math.random() * 10 + 10 + "px", // 大小不一
            zIndex: 9999,
            pointerEvents: "none",
            opacity: 1
        });

        // 向上飘动并消失
        gsap.to(span, {
            y: -100 - Math.random() * 50, // 向上飘
            x: (Math.random() - 0.5) * 30, // 稍微左右摆动
            opacity: 0,
            duration: 1 + Math.random(),
            ease: "power1.out",
            onComplete: () => span.remove()
        });
    }
}

// =================================================
// 1. 小球核心运动代码 (Ball Movement) - 修正版
// =================================================

// 1. 尝试找到整个页面的主容器，如果没有，就用 body
// 这样可以确保球会一直滚到页面最最最底下
const scrollTriggerEl = document.querySelector("#main-container") || document.body;

const ballTimeline = gsap.timeline({
    scrollTrigger: {
        trigger: scrollTriggerEl, // 改为整个页面容器
        start: "top top",         // 页面顶部开始
        end: "bottom bottom",     // 页面底部结束 (或者用 "bottom top" 延长更多)
        scrub: 1,                 // 增加一点延迟感(1秒)，让球的运动更顺滑，不那么生硬
        markers: true             // 【调试开关】开启后屏幕右侧会有 Start/End 标记，确认没问题后删掉这行
    }
});

ballTimeline.to("#DATA-PAR", {
    motionPath: {
        path: "#motion-path",
        align: "#motion-path",   // 让球强制对齐到路径上
        alignOrigin: [0.5, 0.5], // 球心对准路径
        autoRotate: true         // 启用旋转，球会根据路径方向转头
    },
    ease: "none", // 匀速
    duration: 1
});

// 💡 额外的小建议：
// 如果球在某些地方被其他图层挡住了，加这一行确保球在最上面
gsap.set("#DATA-PAR", { zIndex: 9999, position: "relative" }); 
// 注意：SVG内部元素的层级是由代码顺序决定的（越在下面层级越高），无法用 z-index。
// 如果球被挡住，你需要去 SVG 源文件里把 <g id="DATA-PAR"> 移到代码的最底下。