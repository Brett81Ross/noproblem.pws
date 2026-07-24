<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>No Problem Pressure Washing Matrix</title>
    <style>
        html, body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            width: 100%;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-sizing: border-box;
            padding: 20px;
            overflow-x: hidden;
            background: linear-gradient(135deg, #020617, #0b132b, #000000, #090d16, #000000);
            background-size: 400% 400%;
            animation: ultraDarkThemeEngine 22s ease infinite;
        }

        @keyframes ultraDarkThemeEngine {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        .wrapper-container {
            width: 100%;
            max-width: 480px;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            flex: 1; 
        }
        .main-content {
            width: 100%;
            text-align: center;
        }
        
        .logo-container {
            margin-top: 10px;
            margin-bottom: 5px;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
        }
        
        .brand-logo-img {
            width: 100%;
            max-width: 440px; 
            height: auto;
            display: block;
            mix-blend-mode: screen; 
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            animation: logoCyberGlowPulse 4s ease-in-out infinite;
        }
        .brand-logo-img:hover {
            transform: scale(1.03);
        }

        @keyframes logoCyberGlowPulse {
            0% { filter: drop-shadow(0 0 12px rgba(0, 240, 255, 0.25)); }
            50% { filter: drop-shadow(0 0 32px rgba(0, 240, 255, 0.6)); }
            100% { filter: drop-shadow(0 0 12px rgba(0, 240, 255, 0.25)); }
        }

        .tagline {
            font-size: 14px;
            color: #94a3b8;
            line-height: 1.5;
            padding: 0 15px;
            margin-top: 0px;
            margin-bottom: 20px;
            text-shadow: 0 1px 5px rgba(0,0,0,0.5);
            font-weight: 500;
        }
        
        .mode-toggle-container {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
            background: rgba(2, 6, 23, 0.7);
            border-radius: 12px;
            padding: 4px;
            border: 1px solid rgba(0, 240, 255, 0.2);
            width: 100%;
            box-sizing: border-box;
        }
        .mode-btn {
            flex: 1;
            padding: 12px;
            text-align: center;
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            color: #475569;
        }
        .mode-btn.active {
            background: rgba(0, 240, 255, 0.15);
            color: #00f0ff;
            box-shadow: 0 0 12px rgba(0, 240, 255, 0.15);
        }

        body.tech-mode .price-badge { display: none !important; }
        body.tech-mode .proposal-total-card { display: none !important; }
        body.tech-mode .interactive-tooltip { display: none !important; }
        body.tech-mode .btn-email { display: none !important; }
        body.tech-mode .proposal-item { cursor: default; }
        body.tech-mode .proposal-item:hover { transform: none; border-color: rgba(56, 189, 248, 0.4); box-shadow: 0 6px 15px rgba(0,0,0,0.5); }
        body.tech-mode .item-text { padding-right: 0; }

        .action-card {
            background: rgba(9, 13, 22, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            padding: 25px;
            border-radius: 20px;
            margin-bottom: 20px;
            text-align: left;
            border: 1px solid rgba(0, 240, 255, 0.2);
            position: relative;
            box-shadow: 0 20px 45px rgba(0,0,0,0.7);
            animation: cardAmbientPulse 6s ease-in-out infinite;
            box-sizing: border-box;
        }

        @keyframes cardAmbientPulse {
            0% { border-color: rgba(0, 240, 255, 0.2); box-shadow: 0 20px 45px rgba(0,0,0,0.7), 0 0 15px rgba(0, 240, 255, 0.05); }
            50% { border-color: rgba(34, 197, 94, 0.35); box-shadow: 0 20px 45px rgba(0,0,0,0.7), 0 0 25px rgba(34, 197, 94, 0.1); }
            100% { border-color: rgba(0, 240, 255, 0.2); box-shadow: 0 20px 45px rgba(0,0,0,0.7), 0 0 15px rgba(0, 240, 255, 0.05); }
        }
        
        .btn {
            display: block;
            width: 100%;
            background: linear-gradient(135deg, #00f0ff, #0096c7);
            color: #020617;
            border: none;
            padding: 16px;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 15px;
            cursor: pointer;
            box-sizing: border-box;
            text-align: center;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            text-decoration: none;
            box-shadow: 0 4px 20px rgba(0, 240, 255, 0.2);
        }
        .btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .btn:active { transform: scale(0.98); }
        .btn-secondary { background: rgba(255, 255, 255, 0.03); color: #f1f5f9; border: 1px solid rgba(255, 255, 255, 0.15); backdrop-filter: blur(4px); }
        .btn-trigger { background: linear-gradient(135deg, #16a34a, #059669); color: #ffffff; margin-top: 15px; box-shadow: 0 4px 15px rgba(22, 163, 74, 0.25); }
        
        .btn-loading {
            background: linear-gradient(270deg, #091d2c, #0b253a, #020617, #061524) !important;
            background-size: 400% 400% !important;
            color: #00f0ff !important;
            cursor: not-allowed;
            pointer-events: none;
            scale: 0.98;
            border: 1px solid #00f0ff !important;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            animation: cyanVoidMove 4s ease infinite, cyanRadarPulse 1.8s alternate infinite !important;
        }
        .btn-loading::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 250%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0, 240, 255, 0.2), transparent);
            animation: scannerLaser 1.5s infinite linear;
        }

        .btn-spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(0, 240, 255, 0.2);
            border-top-color: #00f0ff;
            border-radius: 50%;
            animation: spinWheel 0.75s linear infinite;
            display: inline-block;
        }

        @keyframes cyanVoidMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes cyanRadarPulse { 0% { box-shadow: 0 0 8px rgba(0, 240, 255, 0.2); } 100% { box-shadow: 0 0 22px rgba(0, 240, 255, 0.5); } }
        @keyframes scannerLaser { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes spinWheel { to { transform: rotate(360deg); } }

        .interactive-tooltip {
            font-size: 13px;
            color: #94a3b8;
            margin-bottom: 25px;
            font-style: italic;
            text-align: left;
            border-left: 2px solid #00f0ff;
            padding-left: 10px;
            line-height: 1.5;
        }

        .preview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 15px; position: relative; overflow: hidden; }
        
        .hud-scan-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, transparent, #00f0ff, transparent);
            box-shadow: 0 0 12px #00f0ff;
            animation: liveHUDScanLine 2s linear infinite;
            display: none;
            z-index: 10;
        }
        @keyframes liveHUDScanLine {
            0% { top: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        
        .preview-thumbnail-wrapper {
            position: relative;
            width: 100%;
            aspect-ratio: 1 / 1;
        }
        
        .preview-thumbnail { 
            width: 100%; 
            height: 100%; 
            border-radius: 8px; 
            border: 1px solid #00f0ff; 
            background-size: cover; 
            background-position: center; 
            transition: transform 0.2s ease; 
        }
        
        .preview-thumbnail-wrapper:hover .preview-thumbnail { 
            transform: scale(1.05); 
        }

        .remove-photo-btn {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 24px;
            height: 24px;
            background-color: #ef4444; 
            color: #ffffff;
            border: 2px solid #020617;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 900;
            cursor: pointer;
            z-index: 20;
            box-shadow: 0 2px 8px rgba(0,0,0,0.8);
            padding: 0;
            line-height: 1;
            transition: all 0.2s ease;
        }
        
        .remove-photo-btn:hover {
            background-color: #dc2626;
            transform: scale(1.15);
        }

        .result-card { background: rgba(9, 13, 22, 0.9); backdrop-filter: blur(16px); border-left: 4px solid #00f0ff; padding: 20px; border-radius: 16px; text-align: left; margin-top: 20px; width: 100%; box-sizing: border-box; }
        .proposal-section-title { font-size: 15px; text-transform: uppercase; color: #00f0ff; margin: 25px 0 16px 0; font-weight: 800; border-bottom: 2px solid rgba(30, 41, 59, 0.8); padding-bottom: 8px; }
        
        .diagnostic-note {
            font-size: 14.5px;
            color: #f8fafc;
            background: rgba(245, 158, 11, 0.12);
            border-left: 4px solid #f59e0b;
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 6px;
            line-height: 1.5;
            font-weight: 500;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        }

        .proposal-item { 
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(56, 189, 248, 0.4);
            padding: 18px 20px; 
            border-radius: 12px; 
            margin-bottom: 24px;
            font-size: 16px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); 
            cursor: pointer; 
            user-select: none; 
            box-shadow: 0 6px 15px rgba(0,0,0,0.5);
        }
        .proposal-item:hover { border-color: #00f0ff; background: rgba(30, 41, 59, 0.95); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 240, 255, 0.2); }
        .proposal-item:active { transform: scale(0.99); }
        .proposal-item.disabled-card { opacity: 0.35; background-color: rgba(2, 6, 23, 0.5); border-color: transparent; transform: none !important; box-shadow: none; }
        .proposal-item.disabled-card .price-badge { background-color: #020617; color: #475569; border-color: #1e293b; text-decoration: line-through; box-shadow: none; }
        
        .item-text { padding-right: 15px; flex-grow: 1; font-weight: 700; color: #ffffff; word-break: break-word; white-space: normal; text-align: left; line-height: 1.4; }
        .price-badge { background-color: #020617; color: #00f0ff; padding: 10px 16px; border-radius: 8px; font-weight: 900; font-size: 16px; border: 1px solid rgba(0, 240, 255, 0.5); transition: all 0.2s ease; box-shadow: 0 0 10px rgba(0, 240, 255, 0.15); }
        
        .proposal-total-card { background: linear-gradient(135deg, #0f172a, #020617); border: 2px solid #22c55e; border-radius: 14px; padding: 22px; margin-top: 30px; text-align: center; box-shadow: 0 10px 30px rgba(34, 197, 94, 0.15); }
        .proposal-total-amount { font-size: 38px; font-weight: 900; color: #22c55e; text-shadow: 0 0 15px rgba(34, 197, 94, 0.3); margin-top: 5px; }
        
        .footer { width: 100%; margin-top: auto; margin-bottom: 10px; padding-top: 40px; font-size: 11px; color: #64748b; text-align: center; opacity: 0.65; line-height: 1.6; letter-spacing: 0.5px; }
        .utility-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 20px; }
        .btn-utility { padding: 14px; font-size: 15px; border-radius: 8px; }
        .btn-email { background: linear-gradient(135deg, #16a34a, #15803d); color: #ffffff; }
        .copy-btn { background-color: #020617; color: #00f0ff; border: 1px solid #1e293b; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; text-transform: uppercase; }
        .result-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .result-title { font-size: 16px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0; font-weight: 800; }
        .hidden-input { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0,0,0,0) !important; border: 0 !important; opacity: 0 !important; z-index: -1 !important; }
    </style>
</head>
<body>

    <div class="wrapper-container">
        <div class="main-content">
            <div class="logo-container">
                <img src="noproblem.webp" alt="No Problem Pressure Washing Solutions Logo" class="brand-logo-img">
            </div>

            <div class="tagline">Snap photos of any residential or commercial site for an instant property diagnosis and itemized quote.</div>

            <div class="mode-toggle-container">
                <div class="mode-btn active" id="btnAdminMode" onclick="requestAdminMode()">Admin Mode</div>
                <div class="mode-btn" id="btnTechMode" onclick="setAppMode('tech')">Technician Mode</div>
            </div>

            <div class="action-card">
                <input type="file" id="cameraInput" accept="image/*" capture="environment" multiple class="hidden-input">
                <input type="file" id="fileInput" accept="image/*" multiple class="hidden-input">

                <button class="btn" onclick="document.getElementById('cameraInput').click()">Take Field Photos</button>
                <button class="btn btn-secondary" onclick="document.getElementById('fileInput').click()">Upload Saved Photos</button>
                
                <div class="preview-grid" id="imagePreviewGrid">
                    <div class="hud-scan-overlay" id="hudLaserBeam"></div>
                </div>
                <button class="btn btn-trigger" id="processTrigger" style="display:none !important;" onclick="submitJobForAnalysis()">Run Diagnostic Scan</button>
            </div>

            <div class="result-card" id="outputCard" style="display: none;">
                <div class="result-title-row">
                    <p class="result-title" id="reportTitleText">Itemized Diagnostic Report</p>
                    <button class="copy-btn" id="copyButton" onclick="copyToClipboard()">Copy Text</button>
                </div>

                <div class="interactive-tooltip">
                    💡 <strong>Tap individual scope items</strong> below to toggle them on or off to adjust the contract total instantly based on customer preference.
                </div>

                <div id="analysisResult"></div>
                
                <div class="proposal-total-card">
                    <div style="font-size:12px; text-transform:uppercase; color:#94a3b8; font-weight:800; margin-bottom:4px; letter-spacing: 1px;">Total Contract Price</div>
                    <div class="proposal-total-amount" id="grandTotalDisplay">$0.00</div>
                </div>

                <div class="utility-row" id="actionPanel" style="display: none !important;">
                    <button class="btn btn-secondary btn-utility" onclick="window.print()">Export PDF</button>
                    <button class="btn btn-utility btn-email" onclick="sendProposalEmail()">Email Client</button>
                </div>
            </div>
        </div>
        
        <div class="footer">
            &copy; 2026 No Problem Pressure Washing Solutions, LLC&trade;<br>
            Powered by Cactus & 🌵 Byte Studios&trade;<br>
            All Rights Reserved
        </div>
    </div>

    <script>
        let stagedBase64Images = [];
        let priceItemsRegistry = [];
        let currentTotalValue = 0;
        let isTechMode = false;
        const ADMIN_PIN = "1234";

        function setAppMode(mode) {
            isTechMode = (mode === 'tech');
            document.getElementById('btnAdminMode').classList.toggle('active', !isTechMode);
            document.getElementById('btnTechMode').classList.toggle('active', isTechMode);

            if (isTechMode) {
                document.body.classList.add('tech-mode');
                document.getElementById('reportTitleText').innerText = "Field Execution Plan";
            } else {
                document.body.classList.remove('tech-mode');
                document.getElementById('reportTitleText').innerText = "Itemized Diagnostic Report";
            }
        }

        function requestAdminMode() {
            if (!isTechMode) return;
            const enteredPin = prompt("Enter Admin PIN to switch modes:");
            if (enteredPin === ADMIN_PIN) {
                setAppMode('admin');
            } else if (enteredPin !== null) {
                alert("Incorrect Admin PIN.");
            }
        }

        document.getElementById('cameraInput').addEventListener('change', function(e) { 
            stageFiles(e.target.files); 
            this.value = ''; 
        });
        document.getElementById('fileInput').addEventListener('change', function(e) { 
            stageFiles(e.target.files); 
            this.value = ''; 
        });

        async function stageFiles(files) {
            if (!files || files.length === 0) return;
            
            try {
                const laser = document.getElementById('hudLaserBeam');
                if (laser) laser.style.display = 'block'; 
                
                for (let i = 0; i < files.length; i++) {
                    const base64Str = await resizeAndCompressImage(files[i]);
                    stagedBase64Images.push(base64Str); 
                }
                
                renderPreviewGrid();
                
                if (laser) laser.style.display = 'none';
            } catch (error) {
                alert("Image processing failed: " + error.message);
                const laser = document.getElementById('hudLaserBeam');
                if (laser) laser.style.display = 'none';
            }
        }

        function removeStagedImage(index) {
            stagedBase64Images.splice(index, 1);
            renderPreviewGrid();
        }

        function renderPreviewGrid() {
            const previewGrid = document.getElementById('imagePreviewGrid');
            const processTrigger = document.getElementById('processTrigger');
            const laser = document.getElementById('hudLaserBeam');
            
            previewGrid.innerHTML = '';
            if (laser) previewGrid.appendChild(laser);

            stagedBase64Images.forEach((base64Str, index) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'preview-thumbnail-wrapper';

                const thumb = document.createElement('div');
                thumb.className = 'preview-thumbnail';
                thumb.style.backgroundImage = `url(${base64Str})`;

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-photo-btn';
                removeBtn.innerHTML = '✕';
                removeBtn.onclick = (e) => {
                    e.stopPropagation(); 
                    removeStagedImage(index);
                };

                wrapper.appendChild(thumb);
                wrapper.appendChild(removeBtn);
                previewGrid.appendChild(wrapper);
            });

            if (stagedBase64Images.length > 0) {
                processTrigger.setAttribute('style', 'display: block !important;');
            } else {
                processTrigger.setAttribute('style', 'display: none !important;');
            }
        }

        function togglePriceCard(index) {
            if (isTechMode) return; 
            
            const cardElement = document.getElementById(`priceCard_${index}`);
            if (!cardElement || !priceItemsRegistry[index]) return;
            
            priceItemsRegistry[index].disabled = !priceItemsRegistry[index].disabled;
            
            if (priceItemsRegistry[index].disabled) {
                cardElement.classList.add('disabled-card');
            } else {
                cardElement.classList.remove('disabled-card');
            }
            
            recalculateGrandTotal();
        }

        function animatePriceRollup(targetAmount) {
            const duration = 400; 
            const startTime = performance.now();
            const startAmount = currentTotalValue;

            function step(currentTime) {
                const elapsedTime = currentTime - startTime;
                const progress = Math.min(elapsedTime / duration, 1);
                const easeProgress = progress * (2 - progress);
                const currentCount = startAmount + (targetAmount - startAmount) * easeProgress;
                
                document.getElementById('grandTotalDisplay').innerText = `$${currentCount.toFixed(2)}`;

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    currentTotalValue = targetAmount;
                    document.getElementById('grandTotalDisplay').innerText = `$${targetAmount.toFixed(2)}`;
                }
            }
            requestAnimationFrame(step);
        }

        function recalculateGrandTotal() {
            let runningSum = 0;
            priceItemsRegistry.forEach(item => {
                if (!item.disabled) {
                    runningSum += item.value;
                }
            });
            animatePriceRollup(runningSum);
        }

        function parseInteractiveHTML(rawText) {
            if (!rawText || typeof rawText !== 'string') return '<div style="color:#ef4444; font-style:italic; padding:10px;">Invalid or empty response data.</div>';
            
            const lines = rawText.split('\n');
            let htmlOutput = "";
            let currentSectionName = "Property Diagnosis";
            let globalCardIndex = 0;
            priceItemsRegistry = []; 

            lines.forEach(line => {
                const cleanLine = line.trim();
                if (!cleanLine) return;

                if (cleanLine.endsWith(':') && !cleanLine.startsWith('-') && !cleanLine.includes('$')) {
                    currentSectionName = cleanLine.replace(':', '').trim();
                    htmlOutput += `<div class="proposal-section-title">${currentSectionName}</div>`;
                } else if (cleanLine.includes('$')) {
                    const segmentPriceMatch = cleanLine.match(/\$[0-9,.]+/);
                    let parsedNumericValue = 0;
                    let textContent = cleanLine.startsWith('-') ? cleanLine.substring(1).trim() : cleanLine;
                    
                    if (segmentPriceMatch) {
                        parsedNumericValue = parseFloat(segmentPriceMatch[0].replace('$', '').replace(/,/g, '')) || 0;
                        textContent = textContent.replace(segmentPriceMatch[0], "").replace(/\s+/g, ' ').trim();
                    }

                    priceItemsRegistry.push({ id: globalCardIndex, section: currentSectionName, cleanText: textContent, value: parsedNumericValue, disabled: false });

                    if (parsedNumericValue > 0) {
                        htmlOutput += `
                            <div class="proposal-item" id="priceCard_${globalCardIndex}" onclick="togglePriceCard(${globalCardIndex})">
                                <div class="item-text">${textContent}</div>
                                <span class="price-badge" id="priceBadge_${globalCardIndex}">$${parsedNumericValue.toFixed(2)}</span>
                            </div>`;
                    }
                    globalCardIndex++;
                } else {
                    let infoText = cleanLine.startsWith('-') ? cleanLine.substring(1).trim() : cleanLine;
                    infoText = infoText.replace('⚠️', '').trim();
                    htmlOutput += `<div class="diagnostic-note">🔍 ${infoText}</div>`;
                }
            });
            return htmlOutput;
        }

        function generateActiveProposalText() {
            let proposalText = isTechMode 
                ? `NO PROBLEM PRESSURE WASHING - FIELD EXECUTION PLAN\n\n`
                : `NO PROBLEM PRESSURE WASHING - ITEMIZED DIAGNOSTIC PROPOSAL\n\n`;

            priceItemsRegistry.forEach(item => {
                if (item.disabled) return;
                if (item.value > 0) {
                    proposalText += isTechMode 
                        ? `- ${item.cleanText}\n` 
                        : `- ${item.cleanText}: $${item.value.toFixed(2)}\n`;
                }
            });
            
            if (!isTechMode) {
                proposalText += `\nTOTAL CONTRACT PRICE: ${document.getElementById('grandTotalDisplay').innerText}\n`;
            }

            proposalText += `\n----------------------------------------\n`;
            proposalText += `TERMS & CONDITIONS:\n`;
            proposalText += `- Estimate valid for 30 days from issuance.\n`;
            proposalText += `- Client guarantees access to water source and operational exterior electrical outlets.\n`;
            proposalText += `- No Problem Pressure Washing Solutions LLC is not responsible for pre-existing unnoted damage, loose siding, or oxidation wear.\n`;
            proposalText += `- Instant quote generated via Matrix Autonomous Engine.\n`;

            return proposalText;
        }

        function copyToClipboard() {
            navigator.clipboard.writeText(generateActiveProposalText());
            const btn = document.getElementById('copyButton');
            btn.innerText = "Copied!";
            setTimeout(() => { btn.innerText = "Copy Text"; }, 2000);
        }

        function sendProposalEmail() {
            window.location.href = `mailto:?subject=Project Quote&body=${encodeURIComponent(generateActiveProposalText())}`;
        }

        async function submitJobForAnalysis() {
            const processTrigger = document.getElementById('processTrigger');
            processTrigger.className = "btn btn-trigger btn-loading";
            processTrigger.innerHTML = `<span class="btn-spinner"></span> SCANNING PROPERTY SURFACES...`;

            try {
                const payloadImages = stagedBase64Images.slice(0, 12).map(img => img.replace(/^data:image\/\w+;base64,/, ""));
                
                const response = await fetch(window.location.origin + '/api/analyze', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json' 
                    },
                    body: JSON.stringify({ images: payloadImages, settings: {} })
                });
                
                if (!response.ok) {
                    let errStr = `Server Fault ${response.status}`;
                    try {
                        const errData = await response.json();
                        errStr = errData.details || errData.error || errStr;
                    } catch (parseEx) {
                        errStr += " (Vercel Edge Drop or Timeout)";
                    }
                    throw new Error(errStr);
                }

                const data = await response.json();
                document.getElementById('hudLaserBeam').style.display = 'none';

                if (data.error) {
                    throw new Error(data.details || data.error);
                }
                
                document.getElementById('outputCard').style.display = 'block';
                document.getElementById('actionPanel').setAttribute('style', 'display: grid !important;');
                document.getElementById('analysisResult').innerHTML = parseInteractiveHTML(data.result);
                
                currentTotalValue = 0; 
                recalculateGrandTotal();
                processTrigger.setAttribute('style', 'display: none !important;');
            } catch (err) {
                document.getElementById('hudLaserBeam').style.display = 'none';
                
                let feedback = err.message;
                if (feedback === 'Failed to fetch') {
                    feedback = 'Failed to fetch. The Vercel edge connection dropped. Ensure your API Key is valid and scan 1 image at a time to stay under server limits.';
                }
                
                alert('Analysis connection fault: ' + feedback);
                processTrigger.className = "btn btn-trigger";
                processTrigger.innerText = "Run Diagnostic Scan";
            }
        }

        function resizeAndCompressImage(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = function (event) {
                    const img = new Image();
                    
                    img.onload = function () {
                        try {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = 600; 
                            canvas.height = 450;
                            ctx.drawImage(img, 0, 0, 600, 450);
                            resolve(canvas.toDataURL('image/jpeg', 0.5)); 
                        } catch (e) {
                            reject(new Error("Canvas layout mapping failed."));
                        }
                    };
                    
                    img.onerror = () => reject(new Error("Browser engine failed to read image stream."));
                    img.src = event.target.result; 
                };
                
                reader.onerror = () => reject(new Error("File reader pipeline crashed."));
                reader.readAsDataURL(file);
            });
        }
    </script>
</body>
</html>
