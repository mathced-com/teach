// mindmap.js

function initMind() {
  const jm = new jsMind({
    container: 'jsmind_container',
    theme: 'greensea',
    editable: true,
    support_html: true,
    view: { engine: 'canvas', draggable: true }
  });
  jm.show({
    meta: { name: 'xmind_clone' },
    format: 'node_tree',
    data: { id: 'root', topic: 'Root', children: [] }
  });
  return jm;
}

function parseMarkdown(mdText) {
  const lines = mdText.split('\n').filter(l => l.trim());
  const root = { id: 'root', topic: 'Root', children: [] }, stack = [root];
  const linkRegex = /\!\[([^\]]*)\]\(([^\)]*)\)|\[([^\]]*)\]\(([^\)]*)\)/; // ![alt](src) or [text](href)

  lines.forEach(line => {
    let level = 0, text = '';
    const m = line.match(/^(#+)\s+(.*)/);
    if (m) { level = m[1].length; text = m[2]; } 
    else if (/^-\s+/.test(line)) { level = 4; text = line.replace(/^-\s+/, ''); } 
    else if (/^(\s*)\*\s+(.*)/.test(line)) {
      const asteriskMatch = line.match(/^(\s*)\*\s+(.*)/);
      const indentLength = asteriskMatch[1].length;
      level = Math.floor(indentLength / 2) + 1; // Convert spaces to levels (2 spaces = 1 level)
      text = asteriskMatch[2];
    }
    else return;

    let nodeData = {};
    let topicText = text;
    const linkMatch = text.match(linkRegex);

    if (linkMatch) {
      if (linkMatch[1] !== undefined) { // Image ![alt](src)
        topicText = linkMatch[1];
        nodeData.image_url = linkMatch[2];
      } else { // Link [text](href)
        topicText = linkMatch[3];
        nodeData.hyperlink = linkMatch[4];
      }
    }

    const html = buildTopic(nodeData, marked.parseInline(topicText));

    if (level === 1 && stack.length === 1) { 
        root.topic = html; 
        root.data = nodeData;
        return; 
    }
    while (stack.length >= level) stack.pop();
    const nid = jsMind.util.uuid.newid();
    const node = { id: nid, topic: html, children: [], data: nodeData };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });
  return { meta: { name: 'md_import' }, format: 'node_tree', data: root };
}

const getCleanTopic = (topic) => {
  if (!topic) return '';
  // Removes all icon span/anchor tags
  return topic.replace(/<(a|span)[^>]*>.*?<\/\1>\s*/g, '');
};

  const buildTopic = (nodeData, cleanTopic) => {
    if (nodeData && nodeData.image_url) {
      return `<a href="${nodeData.image_url}" target="_blank" onclick="event.stopPropagation()" data-image-url="${nodeData.image_url}">🖼️</a> ${cleanTopic}`;
    }
    if (nodeData && nodeData.hyperlink) {
      return `<a href="${nodeData.hyperlink}" target="_blank" onclick="event.stopPropagation()" data-hyperlink="${nodeData.hyperlink}">🔗</a> ${cleanTopic}`;
    }
    return cleanTopic;
  }
function getDepth(node) {
  let d = 0, c = node;
  while (c.parent) { d++; c = c.parent; }
  return d;
}

function applyLayerColors(jm) {
  const palette = ['#e53935', '#1e88e5', '#fb8c00', '#9c27b0', '#8e24aa'];
  Object.values(jm.mind.nodes).forEach(n => {
    const d = getDepth(n);
    if (d > 0) jm.set_node_color(n.id, palette[(d - 1) % palette.length], null);
  });
}

function enablePanAndZoom(container) {
    const panel = container.querySelector('.jsmind-inner') || container;
    let isPanning = false, startX = 0, startY = 0;
    let scale = 1, panX = 0, panY = 0;
    let lastTouchDistance = 0;

    function getTransformValues() {
        const transform = panel.style.transform;
        const scaleMatch = transform.match(/scale\(([^)]+)\)/); 
        const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/); 
        scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
        panX = translateMatch ? parseFloat(translateMatch[1]) : 0;
        panY = translateMatch ? parseFloat(translateMatch[2]) : 0;
    }
    
    function updateTransform() { panel.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`; }

    function onMouseDown(e) { if (e.target.closest('.jsmind-node') || e.target.hasAttribute('nodeid') || e.target.classList.contains('jsmind-editor-input')) return; if (e.button !== 0) return; isPanning = true; container.classList.add('grabbing'); startX = e.clientX; startY = e.clientY; getTransformValues(); e.preventDefault(); }    function onMouseMove(e) { if (!isPanning) return; const dx = e.clientX - startX, dy = e.clientY - startY; panX += dx; panY += dy; startX = e.clientX; startY = e.clientY; updateTransform(); e.preventDefault(); }    function onMouseUp(e) { if (!isPanning) return; isPanning = false; container.classList.remove('grabbing'); e.preventDefault(); }    function onWheel(e) { e.preventDefault(); getTransformValues(); const rect = container.getBoundingClientRect(), mouseX = e.clientX - rect.left, mouseY = e.clientY - rect.top; const oldScale = scale, delta = e.deltaY > 0 ? 0.9 : 1.1; scale = Math.max(0.1, Math.min(5, scale * delta)); panX = mouseX - (mouseX - panX) * (scale / oldScale); panY = mouseY - (mouseY - panY) * (scale / oldScale); updateTransform(); }    function onTouchStart(e) { if (e.target.closest('.jsmind-node') || e.target.hasAttribute('nodeid') || e.target.classList.contains('jsmind-editor-input')) return; getTransformValues(); if (e.touches.length === 1) { isPanning = true; container.classList.add('grabbing'); startX = e.touches[0].clientX; startY = e.touches[0].clientY; } else if (e.touches.length === 2) { isPanning = false; const t1 = e.touches[0], t2 = e.touches[1]; lastTouchDistance = Math.sqrt(Math.pow(t1.clientX - t2.clientX, 2) + Math.pow(t1.clientY - t2.clientY, 2)); } e.preventDefault(); }    function onTouchMove(e) { e.preventDefault(); if (e.touches.length === 1 && isPanning) { const touch = e.touches[0], dx = touch.clientX - startX, dy = touch.clientY - startY; panX += dx; panY += dy; startX = touch.clientX; startY = touch.clientY; updateTransform(); } else if (e.touches.length === 2) { const t1 = e.touches[0], t2 = e.touches[1]; const currentTouchDistance = Math.sqrt(Math.pow(t1.clientX - t2.clientX, 2) + Math.pow(t1.clientY - t2.clientY, 2)); const rect = container.getBoundingClientRect(), centerX = (t1.clientX + t2.clientX) / 2 - rect.left, centerY = (t1.clientY + t2.clientY) / 2 - rect.top; const oldScale = scale, delta = currentTouchDistance / lastTouchDistance; scale = Math.max(0.1, Math.min(5, scale * delta)); panX = centerX - (centerX - panX) * (scale / oldScale); panY = centerY - (centerY - panY) * (scale / oldScale); lastTouchDistance = currentTouchDistance; updateTransform(); } }     function onTouchEnd(e) { if (isPanning) { isPanning = false; container.classList.remove('grabbing'); } if (e.touches.length < 2) { lastTouchDistance = 0; } }    container.addEventListener('mousedown', onMouseDown); container.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);    container.addEventListener('wheel', onWheel, { passive: false });    container.addEventListener('touchstart', onTouchStart, { passive: false }); container.addEventListener('touchmove', onTouchMove, { passive: false }); container.addEventListener('touchend', onTouchEnd); 
}

function nodeToMarkdown(node, depth = 1) { 
  let md = ''; 
  if (!node) return md; 

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = node.topic;

  const plainTopic = (tempDiv.textContent || tempDiv.innerText || '').replace(/^(🔗|🖼️)\s*/, '').replace(/\n/g, ' ');
  let line = '#'.repeat(depth) + ' ';

  const imageEl = tempDiv.querySelector('a[data-image-url]');
  const linkEl = tempDiv.querySelector('a[data-hyperlink]');

  if (imageEl) {
    line += `![${plainTopic}](${imageEl.getAttribute('data-image-url')})`;
  } else if (linkEl) {
    line += `[${plainTopic}](${linkEl.getAttribute('data-hyperlink')})`;
  } else {
    line += plainTopic;
  }
  md += line + '\n';

  if (node.children && node.children.length > 0) { 
    for (const child of node.children) { 
      md += nodeToMarkdown(child, depth + 1); 
    } 
  } 
  return md; 
}

function exportToMarkdown(jm) { 
  const mindData = jm.get_data('node_tree'); 
  if (!mindData || !mindData.data) { 
    alert('沒有可以匯出的心智圖資料'); 
    return; 
  } 
  const markdown = nodeToMarkdown(mindData.data), 
        title = (mindData.data.topic || 'mindmap').replace(/<[^>]+>/g, ''); 
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' }); 
  const link = document.createElement('a'); 
  link.href = URL.createObjectURL(blob); 
  link.download = title + '.md'; 
  link.click(); 
}

// --- Main Logic ---
document.addEventListener('DOMContentLoaded', () => {
  const jm = initMind();
  applyLayerColors(jm);
  jm.add_event_listener(() => applyLayerColors(jm));

  // --- Element References ---
  const menuToggle = document.getElementById('menu_toggle'), topMenu = document.getElementById('top_menu');
  const settingsModalOverlay = document.getElementById('settings_modal_overlay'), gasUrlInput = document.getElementById('gas_url_input');
  const cloudFilesModalOverlay = document.getElementById('cloud_files_modal_overlay'), cloudFilesList = document.getElementById('cloud_files_list');
  const uploaderModalOverlay = document.getElementById('uploader_modal_overlay'), uploaderNameInput = document.getElementById('uploader_name_input');
  const uploaderFilter = document.getElementById('uploader_filter'), keywordFilter = document.getElementById('keyword_filter');
  const helpModalOverlay = document.getElementById('help_modal_overlay');
  const linkModalOverlay = document.getElementById('link_modal_overlay'), linkUrlInput = document.getElementById('link_url_input');
  const imageUrlModalOverlay = document.getElementById('image_url_modal_overlay'), imageUrlInput = document.getElementById('image_url_input');
  const gdocUrlInput = document.getElementById('gdoc_url_input'), btnFetchGdoc = document.getElementById('btn_fetch_gdoc'), gdocStatus = document.getElementById('gdoc_status'), gdocImageResults = document.getElementById('gdoc_image_results');
  const mdImportModalOverlay = document.getElementById('md_import_modal_overlay'), mdFileInput = document.getElementById('md_file_input'), mdTextInput = document.getElementById('md_text_input'), btnProcessMdImport = document.getElementById('btn_process_md_import');
  const imageDisplayModalOverlay = document.getElementById('image_display_modal_overlay'), modalImage = document.getElementById('modal_image');
  const notificationLayer = document.getElementById('notification_layer');
  const outlineDepthSelect = document.getElementById('outline_depth_select'); // *** NEW ***
  let notificationTimer;
  let linkEditingNodeId = null;
  let imageEditingNodeId = null;
  let allCloudFiles = [];
  
  // --- Presentation Mode Variables ---
  let presentationSlides = [];
  let currentSlideIndex = 0;
  let isInPresentationMode = false;

  // --- Helper Functions ---
  const getGasUrl = () => { if (typeof hardcodedGasUrl !== 'undefined' && hardcodedGasUrl.trim() !== '') { return hardcodedGasUrl.trim(); } return localStorage.getItem('gasWebAppUrl') || ''; };
  const showNotification = (message, isError = false) => {
    clearTimeout(notificationTimer);
    notificationLayer.textContent = message;
    notificationLayer.className = isError ? 'error' : 'success';
    notificationLayer.classList.add('show');
    notificationTimer = setTimeout(() => { notificationLayer.classList.remove('show'); }, isError ? 5000 : 3000);
  };

  const showGDocStatus = (message, type) => {
    gdocStatus.innerHTML = message;
    gdocStatus.style.color = type === 'error' ? '#e74c3c' : '#2c3e50';
  };

  async function extractGDocImages() {
    const url = gdocUrlInput.value.trim();
    if (!url) {
        showGDocStatus('請輸入 Google 文件網址', 'error');
        return;
    }

    gdocImageResults.innerHTML = '';
    showGDocStatus('讀取中...', 'info');

    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`網路錯誤: ${response.status} ${response.statusText}`);
        }
        
        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const images = doc.querySelectorAll('img');

        if (images.length === 0) {
            showGDocStatus('在該文件中找不到任何圖片。', 'info');
            return;
        }

        gdocStatus.innerHTML = '';
        let imageCount = 0;
        images.forEach(img => {
            const src = img.src;
            if (src && src.includes('googleusercontent.com')) {
                imageCount++;
                const imgEl = document.createElement('img');
                imgEl.src = src;
                imgEl.style.width = '100px';
                imgEl.style.height = '100px';
                imgEl.style.objectFit = 'cover';
                imgEl.style.cursor = 'pointer';
                imgEl.style.border = '2px solid transparent';
                imgEl.onclick = () => {
                    imageUrlInput.value = src;
                    // Optional: highlight selected image
                    document.querySelectorAll('#gdoc_image_results img').forEach(i => i.style.borderColor = 'transparent');
                    imgEl.style.borderColor = '#29b6f6';
                };
                gdocImageResults.appendChild(imgEl);
            }
        });
        
        if (imageCount === 0) {
             showGDocStatus('找不到 Google 文件格式的圖片。', 'info');
        } else {
             showGDocStatus(`成功找到 ${imageCount} 張圖片！點擊圖片可選用。`, 'success');
        }

    } catch (error) {
        console.error('提取過程中發生錯誤:', error);
        showGDocStatus(`抓取失敗！請檢查網址是否正確且已「發佈到網路」。`, 'error');
    }
  }

  btnFetchGdoc.addEventListener('click', extractGDocImages);

  // --- Presentation Mode Functions ---

  // *** NEW: Helper function to build HTML outline ***
  function buildOutlineHtmlRecursive(node) {
      const cleanText = getCleanTopic(node.topic);
      
      let html = `<li>${cleanText}</li>`;
      
      if (node.children && node.children.length > 0) {
          html += '<ul>';
          node.children.forEach(child => {
              html += buildOutlineHtmlRecursive(child); // Recursive call
          });
          html += '</ul>';
      }
      return html;
  }

  // *** MODIFIED: generatePresentationSlides ***
  const generatePresentationSlides = (mindData) => {
    const slides = [];
    const rootNode = mindData.data;
    
    // Get the selected depth from the dropdown
    const START_OUTLINE_DEPTH = parseInt(outlineDepthSelect.value, 10);
    
    const traverseNode = (node, breadcrumb = [], parentNode = null) => {
      const cleanTopic = getCleanTopic(node.topic);
      const currentDepth = breadcrumb.length; // 0=root, 1=main, 2=sub...

      // Check if current depth is less than the trigger depth
      if (currentDepth < START_OUTLINE_DEPTH) {
        // --- Single Slide Mode ---
        slides.push({
          type: 'single', // Add type
          title: cleanTopic,
          parentNode: parentNode,
          breadcrumb: [...breadcrumb],
          node: node
        });
        
        // Continue recursion
        if (node.children && node.children.length > 0) {
          const currentBreadcrumb = [...breadcrumb, cleanTopic];
          node.children.forEach(child => {
            traverseNode(child, currentBreadcrumb, node);
          });
        }
      } else {
        // --- Outline Slide Mode ---
        // Add this node and all its children as ONE slide
        slides.push({
          type: 'outline', // Add type
          title: cleanTopic,
          parentNode: parentNode,
          breadcrumb: [...breadcrumb],
          node: node // The whole node object (with children)
        });
        
        // *** DO NOT RECURSE ***
        // All children are handled by this single 'outline' slide
      }
    };
    
    traverseNode(rootNode);
    return slides;
  };

  // *** MODIFIED: showPresentationSlide ***
  const showPresentationSlide = (index, direction = 'none') => {
    if (index < 0 || index >= presentationSlides.length) return;
    
    const slide = presentationSlides[index];
    const overlay = document.getElementById('presentation_overlay');
    const mainContent = overlay.querySelector('.presentation-main'); // *** Get main content area ***
    const breadcrumbCorner = overlay.querySelector('.presentation-breadcrumb-corner');
    const title = overlay.querySelector('.presentation-title');
    const counter = overlay.querySelector('.slide-counter');
    const prevBtn = document.getElementById('btn_prev_slide');
    const nextBtn = document.getElementById('btn_next_slide');
    
    // *** MODIFIED: New breadcrumb logic with indentation, persistent parents, and page numbers ***
    let lineStack = [];
    let processedTitles = new Set();
    let currentSlideForPath = slide;

    while (currentSlideForPath) {
        // 1. Get all siblings of the current slide
        const parentSlideNode = currentSlideForPath.parentNode;
        const siblingSlides = presentationSlides.filter(s => s.parentNode === parentSlideNode);
        const currentSiblingIndex = siblingSlides.indexOf(currentSlideForPath);
        
        // 2. Add *all* previous and current siblings to the stack (in reverse order)
        for (let i = currentSiblingIndex; i >= 0; i--) {
            const sibling = siblingSlides[i];
            // Add to stack only if we haven't processed this title before
            if (!processedTitles.has(sibling.title)) {
                const indent = '&nbsp;&nbsp;'.repeat(sibling.breadcrumb.length);
                const arrow = (sibling.breadcrumb.length > 0) ? '→ ' : '';
                
                // *** NEW: Get page number ***
                const pageNum = presentationSlides.indexOf(sibling) + 1;
                lineStack.push(`${indent}${arrow}${sibling.title} (${pageNum})`); // Add page number
                
                processedTitles.add(sibling.title);
            }
        }
        
        // 3. Move up to the parent *slide*
        currentSlideForPath = presentationSlides.find(s => s.node === parentSlideNode);
    }
    
    // Reverse the stack and join with line breaks
    breadcrumbCorner.innerHTML = lineStack.reverse().join('<br>');
    
    
    let newHtmlContent = '';
    let newClassName = '';
    let needsOutlineAlign = false; // *** Flag for alignment ***

    // Check slide type
    if (slide.type === 'outline') {
      // --- Render Outline Slide ---
      needsOutlineAlign = true; // *** Flag for top alignment ***
      const rootTopic = getCleanTopic(slide.node.topic);
      let childrenHtml = '';
      if (slide.node.children && slide.node.children.length > 0) {
        childrenHtml = '<ul>';
        slide.node.children.forEach(child => {
           childrenHtml += buildOutlineHtmlRecursive(child);
        });
        childrenHtml += '</ul>';
      }
      // Combine outline page
      newHtmlContent = `<h1>${rootTopic}</h1>${childrenHtml}`;
      newClassName = 'presentation-title outline-style'; // Add 'outline-style' for CSS

    } else {
      // --- Render Single Slide (Original Behavior) ---
      needsOutlineAlign = false; // *** Flag for center alignment ***
      let titleText = slide.node.topic || slide.title;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = titleText;
      const cleanText = tempDiv.textContent || tempDiv.innerText || '';
      
      // Add line breaks after punctuation marks
      const formattedText = cleanText.replace(/([。、，；：！？])/g, '$1<br>');
      
      newHtmlContent = formattedText;
      newClassName = 'presentation-title';
    }
    
    // Apply fade transition
    if (direction !== 'none') {
      // Start fade out
      title.className = title.className.replace('active', 'fade-out');
      
      // Wait for complete fade out
      setTimeout(() => {
        // *** MODIFICATION: Update alignment *while content is invisible* ***
        if (needsOutlineAlign) {
            mainContent.classList.add('has-outline');
        } else {
            mainContent.classList.remove('has-outline');
        }

        // Update content
        title.innerHTML = newHtmlContent;
        
        // Set up for fade-in
        title.className = newClassName + ' fade-in';
        
        // Start fade-in
        setTimeout(() => {
          title.className = newClassName + ' active';
        }, 50);
      }, 1200); // Wait for 1.2s fade out
    } else {
      // No transition for initial load
      // *** MODIFICATION: Set alignment for initial load ***
      if (needsOutlineAlign) {
            mainContent.classList.add('has-outline');
        } else {
            mainContent.classList.remove('has-outline');
        }
      title.innerHTML = newHtmlContent;
      title.className = newClassName + ' active';
    }
    
    // Update counter
    counter.textContent = `${index + 1} / ${presentationSlides.length}`;
    
    // Update navigation buttons
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === presentationSlides.length - 1;
    
    currentSlideIndex = index;
  };

  // *** MODIFIED: startPresentationMode ***
  const startPresentationMode = () => {
    const mindData = jm.get_data('node_tree');
    if (!mindData || !mindData.data) {
      showNotification('沒有可以播放的心智圖資料', true);
      return;
    }
    
    presentationSlides = generatePresentationSlides(mindData); // This will now use the dropdown value
    if (presentationSlides.length === 0) {
      showNotification('心智圖沒有內容可以播放', true);
      return;
    }
    
    isInPresentationMode = true;
    currentSlideIndex = 0;
    
    const overlay = document.getElementById('presentation_overlay');
    overlay.style.display = 'block';
    
    // *** NEW: Add slide jumping function to counter ***
    const counter = overlay.querySelector('.slide-counter');
    counter.style.cursor = 'pointer';
    counter.title = '點擊跳轉頁碼';
    // Remove old listener if it exists, then add new one
    counter.onclick = null; 
    counter.onclick = () => {
        const targetSlide = prompt(`請輸入要跳轉的頁碼 (1 - ${presentationSlides.length}):`, currentSlideIndex + 1);
        if (targetSlide) {
            const targetIndex = parseInt(targetSlide, 10) - 1;
            if (!isNaN(targetIndex) && targetIndex >= 0 && targetIndex < presentationSlides.length) {
                showPresentationSlide(targetIndex, 'none'); // 'none' for no animation
            } else {
                alert('輸入無效的頁碼');
            }
        }
    };
    
    showPresentationSlide(0); // This will call the 'else' block (no transition)
    showNotification('簡報模式已啟動，使用方向鍵或按鈕導航');
  };

  const exitPresentationMode = () => {
    isInPresentationMode = false;
    document.getElementById('presentation_overlay').style.display = 'none';
    showNotification('已退出簡報模式');
  };

  const nextSlide = () => {
    if (currentSlideIndex < presentationSlides.length - 1) {
      showPresentationSlide(currentSlideIndex + 1, 'slide');
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      showPresentationSlide(currentSlideIndex - 1, 'slide');
    }
  };

  // --- Menu Logic ---
  menuToggle.addEventListener('click', () => { menuToggle.classList.toggle('active'); topMenu.classList.toggle('active'); });

  // --- Node Operations ---
  document.getElementById('btn_add_child').onclick = () => { const sel = jm.get_selected_node(), nid = jsMind.util.uuid.newid(); jm.add_node(sel, nid, 'New Node'); jm.select_node(nid); };
  document.getElementById('btn_add_sibling').onclick = () => { const sel = jm.get_selected_node(); if (sel.isroot) return alert('根節點無法新增同階'); jm.add_node(sel.parent, jsMind.util.uuid.newid(), 'New Node'); };
  document.getElementById('btn_delete').onclick = () => { const sel = jm.get_selected_node(); if (sel.isroot) return alert('無法刪除根節點'); jm.remove_node(sel.id); };
  
  // --- Toggle All Nodes ---
  let allExpanded = true;
  document.getElementById('btn_toggle_all').onclick = () => {
    const rootNode = jm.get_root();
    if (allExpanded) {
      // Collapse all nodes
      const collapseNode = (node) => {
        if (node && !node.isroot && node.children && node.children.length > 0) {
          jm.collapse_node(node.id);
        }
        if (node && node.children) {
          node.children.forEach(child => collapseNode(child));
        }
      };
      collapseNode(rootNode);
      allExpanded = false;
      showNotification('已收合所有節點');
    } else {
      // Expand all nodes
      const expandNode = (node) => {
        if (node && !node.isroot) {
          jm.expand_node(node.id);
        }
        if (node && node.children) {
          node.children.forEach(child => expandNode(child));
        }
      };
      expandNode(rootNode);
      allExpanded = true;
      showNotification('已展開所有節點');
    }
  };

  // --- Presentation Mode ---
  document.getElementById('btn_presentation').onclick = startPresentationMode;
  document.getElementById('btn_exit_presentation').onclick = exitPresentationMode;
  document.getElementById('btn_prev_slide').onclick = prevSlide;
  document.getElementById('btn_next_slide').onclick = nextSlide;

  let isReordered = false;
  document.getElementById('btn_reorder').onclick = () => {
    const root = jm.get_root();
    if (!root || !root.children || root.children.length < 2) {
      showNotification('至少需要2個二階節點才能重新排列', true);
      return;
    }

    isReordered = !isReordered;
    const children = root.children;
    const midpoint = Math.ceil(children.length / 2);

    if (isReordered) {
      for (let i = 0; i < children.length; i++) {
        const direction = i < midpoint ? jsMind.direction.right : jsMind.direction.left;
        children[i].direction = direction;
      }
      showNotification('已切換為左右排列');
    } else {
      for (const child of children) {
        child.direction = jsMind.direction.right;
      }
      showNotification('已恢復單側排列');
    }
    jm.layout.layout();
    jm.view.show(false);
  };

  // --- File Operations ---
  // --- Markdown Import Modal ---
  document.getElementById('btn_open_md_import').onclick = () => {
    mdImportModalOverlay.style.display = 'flex';
  };

  document.getElementById('btn_cancel_md_import').onclick = () => {
    mdImportModalOverlay.style.display = 'none';
  };

  document.getElementById('btn_process_md_import').onclick = () => {
    const text = mdTextInput.value;
    const file = mdFileInput.files[0];

    const processText = (markdownText) => {
      if (markdownText) {
        jm.show(parseMarkdown(markdownText));
        applyLayerColors(jm);
        topMenu.classList.remove('active');
        menuToggle.classList.remove('active');
        mdImportModalOverlay.style.display = 'none';
        mdTextInput.value = '';
        mdFileInput.value = '';
      } else {
        showNotification('沒有提供 Markdown 內容', true);
      }
    };

    if (text) {
      processText(text);
    } else if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        processText(e.target.result);
      };
      reader.readAsText(file);
    } else {
      showNotification('請貼上文字或選擇檔案', true);
    }
  };
  
  // *** MODIFIED: btn_download.onclick ***
  document.getElementById('btn_download').onclick = () => { 
    const data = jm.get_data(), title = (data.data.topic || 'mindmap').replace(/<[^>]+>/g, ''), panAndZoomFnString = enablePanAndZoom.toString(); 
    
    // *** MODIFIED: Updated breadcrumb and jump-to-slide logic in exported file's JS ***
    const presentationJS = `
let presentationSlides=[];
let currentSlideIndex=0;
let isInPresentationMode=false;

${buildOutlineHtmlRecursive.toString().replace('getCleanTopic','getCleanTopic_jm2')}
const getCleanTopic_jm2=(topic)=>{ if(!topic)return ''; return topic.replace(/<(a|span)[^>]*>.*?<\\/\\1>\\s*/g,''); };

const generatePresentationSlides=(mindData)=>{
  const slides=[];
  const rootNode=mindData.data;
  const outlineDepthSelect = document.getElementById('outline_depth_select');
  const START_OUTLINE_DEPTH = parseInt(outlineDepthSelect.value, 10);
  
  const traverseNode=(node,breadcrumb=[],parentNode=null)=>{
    const cleanTopic=getCleanTopic_jm2(node.topic);
    const currentDepth=breadcrumb.length;
    if(currentDepth<START_OUTLINE_DEPTH){
      slides.push({type:'single',title:cleanTopic,parentNode:parentNode,breadcrumb:[...breadcrumb],node:node});
      if(node.children&&node.children.length>0){
        const currentBreadcrumb=[...breadcrumb,cleanTopic];
        node.children.forEach(child=>{traverseNode(child,currentBreadcrumb,node);});
      }
    }else{
      slides.push({type:'outline',title:cleanTopic,parentNode:parentNode,breadcrumb:[...breadcrumb],node:node});
    }
  };
  traverseNode(rootNode);
  return slides;
};

const showPresentationSlide=(index,direction='none')=>{
  if(index<0||index>=presentationSlides.length)return;
  const slide=presentationSlides[index];
  const overlay=document.getElementById('presentation_overlay');
  const mainContent = overlay.querySelector('.presentation-main');
  const breadcrumbCorner=overlay.querySelector('.presentation-breadcrumb-corner');
  const title=overlay.querySelector('.presentation-title');
  const counter=overlay.querySelector('.slide-counter');
  const prevBtn=document.getElementById('btn_prev_slide');
  const nextBtn=document.getElementById('btn_next_slide');
  
  let lineStack = [];
  let processedTitles = new Set();
  let currentSlideForPath = slide;
  while (currentSlideForPath) {
      const parentSlideNode = currentSlideForPath.parentNode;
      const siblingSlides = presentationSlides.filter(s => s.parentNode === parentSlideNode);
      const currentSiblingIndex = siblingSlides.indexOf(currentSlideForPath);
      for (let i = currentSiblingIndex; i >= 0; i--) {
          const sibling = siblingSlides[i];
          if (!processedTitles.has(sibling.title)) {
              const indent = '&nbsp;&nbsp;'.repeat(sibling.breadcrumb.length);
              const arrow = (sibling.breadcrumb.length > 0) ? '→ ' : '';
              const pageNum = presentationSlides.indexOf(sibling) + 1;
              lineStack.push(indent + arrow + sibling.title + ' (' + pageNum + ')');
              processedTitles.add(sibling.title);
          }
      }
      currentSlideForPath = presentationSlides.find(s => s.node === parentSlideNode);
  }
  breadcrumbCorner.innerHTML = lineStack.reverse().join('<br>');
  
  let newHtmlContent = '';
  let newClassName = '';
  let needsOutlineAlign = false;

  if (slide.type === 'outline') {
      needsOutlineAlign = true;
      const rootTopic = getCleanTopic_jm2(slide.node.topic);
      let childrenHtml = '';
      if (slide.node.children && slide.node.children.length > 0) {
          childrenHtml = '<ul>';
          slide.node.children.forEach(child => {
             childrenHtml += buildOutlineHtmlRecursive(child);
          });
          childrenHtml += '</ul>';
      }
      newHtmlContent = '<h1>' + rootTopic + '</h1>' + childrenHtml;
      newClassName = 'presentation-title outline-style';
  } else {
      needsOutlineAlign = false;
      let titleText = slide.node.topic || slide.title;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = titleText;
      const cleanText = tempDiv.textContent || tempDiv.innerText || '';
      const formattedText = cleanText.replace(/([。、，；：！？])/g, '$1<br>');
      newHtmlContent = formattedText;
      newClassName = 'presentation-title';
  }
  
  if (direction !== 'none') {
      title.className = title.className.replace('active', 'fade-out');
      setTimeout(() => {
          if (needsOutlineAlign) { mainContent.classList.add('has-outline'); }
          else { mainContent.classList.remove('has-outline'); }
          title.innerHTML = newHtmlContent;
          title.className = newClassName + ' fade-in';
          setTimeout(() => { title.className = newClassName + ' active'; }, 50);
      }, 1200);
  } else {
      if (needsOutlineAlign) { mainContent.classList.add('has-outline'); }
      else { mainContent.classList.remove('has-outline'); }
      title.innerHTML = newHtmlContent;
      title.className = newClassName + ' active';
  }
  
  counter.textContent = (index + 1) + ' / ' + presentationSlides.length;
  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === presentationSlides.length - 1;
  currentSlideIndex = index;
};

const startPresentationMode=()=>{
  const mindData=jm2.get_data('node_tree');
  if(!mindData||!mindData.data){ alert('沒有可以播放的心智圖資料'); return; }
  presentationSlides=generatePresentationSlides(mindData);
  if(presentationSlides.length===0){ alert('心智圖沒有內容可以播放'); return; }
  isInPresentationMode=true;
  currentSlideIndex=0;
  const overlay=document.getElementById('presentation_overlay');
  overlay.style.display='block';
  
  const counter = overlay.querySelector('.slide-counter');
  counter.style.cursor = 'pointer';
  counter.title = '點擊跳轉頁碼';
  counter.onclick = null; 
  counter.onclick = () => {
      const targetSlide = prompt('請輸入要跳轉的頁碼 (1 - ' + presentationSlides.length + '):', currentSlideIndex + 1);
      if (targetSlide) {
          const targetIndex = parseInt(targetSlide, 10) - 1;
          if (!isNaN(targetIndex) && targetIndex >= 0 && targetIndex < presentationSlides.length) {
              showPresentationSlide(targetIndex, 'none');
          } else {
              alert('輸入無效的頁碼');
          }
      }
  };
  
  showPresentationSlide(0);
};
const exitPresentationMode=()=>{
  isInPresentationMode=false;
  document.getElementById('presentation_overlay').style.display='none';
};
const nextSlide=()=>{
  if(currentSlideIndex<presentationSlides.length-1){
    showPresentationSlide(currentSlideIndex+1,'slide');
  }
};
const prevSlide=()=>{
  if(currentSlideIndex>0){
    showPresentationSlide(currentSlideIndex-1,'slide');
  }
};
document.getElementById('presentation_btn').onclick=startPresentationMode;
document.getElementById('btn_exit_presentation').onclick=exitPresentationMode;
document.getElementById('btn_prev_slide').onclick=prevSlide;
document.getElementById('btn_next_slide').onclick=nextSlide;
document.addEventListener('keydown',(e)=>{
  if(!isInPresentationMode)return;
  switch(e.key){
    case 'ArrowRight':
    case ' ':
      e.preventDefault();
      nextSlide();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      prevSlide();
      break;
    case 'Escape':
      e.preventDefault();
      exitPresentationMode();
      break;
  }
});`;
    
    // *** MODIFIED: Updated HTML string with new styles and elements ***
    const html = `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><title>${title}</title><style>
    html,body{height:100%;margin:0;overflow:hidden;}
    #jsmind_container{width:100%;height:100vh;background:#ecf0f1;cursor:grab;overflow:hidden;}
    .jsmind-inner{overflow:visible!important;transform-origin:0 0;}
    #jsmind_container.grabbing{cursor:grabbing;}
    #attribution{position:absolute;bottom:10px;right:10px;padding:4px 8px;background:rgba(0,0,0,0.5);color:#fff;border-radius:4px;font-size:12px;z-index:10;}
    #attribution a{color:#ffd54f;text-decoration:none;}
    #toggle_btn, #presentation_btn, #btn_reorder {
      position:fixed;right:20px;width:48px;height:48px;border-radius:50%;border:none;color:white;font-size:20px;cursor:pointer;
      box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:all 0.2s;z-index:100;
    }
    #toggle_btn:hover, #presentation_btn:hover, #btn_reorder:hover {transform:scale(1.1);box-shadow:0 6px 16px rgba(0,0,0,0.4);}
    #toggle_btn{top:20px;background:linear-gradient(45deg,#ab47bc,#8e24aa);}
    #presentation_btn{top:80px;background:linear-gradient(45deg,#5c6bc0,#3f51b5);}
    #btn_reorder{top:140px;background:linear-gradient(45deg,#546e7a,#37474f);}
    
    /* *** NEW: Added Styles for Outline Select *** */
    #outline_select_container{
      position:fixed;top:200px;right:20px;z-index:100;background:rgba(0,0,0,0.5);padding:8px;
      border-radius:10px;color:white;font-size:12px;display:flex;flex-direction:column;gap:5px;
    }
    #outline_select_container select {
      background:#333;color:white;border:1px solid #555;border-radius:4px;padding:2px;
    }

    .presentation-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:linear-gradient(135deg,#1e3c72,#2a5298);display:none;z-index:2000;}
    .presentation-content{width:100%;height:100%;display:flex;flex-direction:column;color:white;}
    .presentation-header{display:flex;justify-content:space-between;align-items:center;padding:20px 40px;background:rgba(0,0,0,0.2);}
    .presentation-breadcrumb{font-size:14px;opacity:0.7;}
    .presentation-controls{display:flex;align-items:center;gap:15px;}
    .presentation-btn{background:rgba(255,255,255,0.2);border:none;color:white;padding:8px 12px;border-radius:5px;cursor:pointer;font-size:16px;transition:background 0.2s;}
    .presentation-btn:hover{background:rgba(255,255,255,0.3);}
    .presentation-btn:disabled{opacity:0.5;cursor:not-allowed;}
    .slide-counter{font-size:14px;min-width:60px;text-align:center;}
    .presentation-main{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:60px;text-align:center;position:relative;overflow:auto;}
    
    /* *** NEW: Added Styles for Outline Mode (Copied from main HTML) *** */
    .presentation-main.has-outline { justify-content: flex-start; }
    .presentation-breadcrumb-corner{position:absolute;top:30px;left:30px;font-size:16px;opacity:0.5;line-height:1.6;max-width:300px;text-align:left;}
    .presentation-title{font-size:8em;font-weight:bold;line-height:1.1;text-shadow:3px 3px 6px rgba(0,0,0,0.4);max-width:90%;word-wrap:break-word;transition:opacity 1.2s ease-in-out;opacity:1;}
    .presentation-title.active{opacity:1;}
    .presentation-title.fade-out{opacity:0!important;}
    .presentation-title.fade-in{opacity:0!important;}
    .presentation-title.outline-style {
        font-size: 3.5em; text-align: center; padding: 0 5%; max-width: 90%; line-height: 1.5;
        max-height: 100%; box-sizing: border-box;
    }
    .presentation-title.outline-style h1 {
        font-size: 1.2em; font-weight: bold; line-height: 1.2; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        margin-bottom: 25px; padding-bottom: 10px; border-bottom: 2px solid rgba(255,255,255,0.3);
    }
    .presentation-title.outline-style ul {
        font-size: 0.8em; list-style-type: disc; padding-left: 40px; line-height: 1.7;
        text-shadow: none; display: inline-block; text-align: left;
    }
    .presentation-title.outline-style ul ul {
        list-style-type: circle; font-size: 0.95em; margin-top: 5px; padding-left: 40px;
    }
    .presentation-title.outline-style li { margin-bottom: 8px; }
    .presentation-children{display:none;}.presentation-child{display:none;}
    </style><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/jsmind@0.6.1/style/jsmind.css"></head>
    <body>
      <div id="jsmind_container"></div>
      <button id="toggle_btn" title="展開/收合所有節點">⚡</button>
      <button id="presentation_btn">📺</button>
      <button id="btn_reorder">↔</button>
      <div id="outline_select_container">
        <label for="outline_depth_select">簡報大綱起始層級:</label>
        <select id="outline_depth_select">
          <option value="99">全部單頁 (預設)</option>
          <option value="2">從第2層</option>
          <option value="3">從第3層</option>
          <option value="4">從第4層</option>
          <option value="5">從第5層</option>
        </select>
      </div>
      <div id="presentation_overlay" class="presentation-overlay"><div class="presentation-content"><div class="presentation-header"><div class="presentation-breadcrumb"></div><div class="presentation-controls"><button class="presentation-btn" id="btn_prev_slide">◀</button><span class="slide-counter"></span><button class="presentation-btn" id="btn_next_slide">▶</button><button class="presentation-btn" id="btn_exit_presentation">✕</button></div></div><div class="presentation-main"><div class="presentation-breadcrumb-corner"></div><div class="presentation-title"></div><div class="presentation-children"></div></div></div></div>
      <div id="attribution">Made by <a href="https://kentxchang.blogspot.tw" target="_blank" rel="noopener">阿剛老師</a></div>
      <script src="https://cdn.jsdelivr.net/npm/jsmind@0.6.1/js/jsmind.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/jsmind@0.6.1/js/jsmind.draggable-node.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
      <script>
        const jm2=new jsMind({container:'jsmind_container',theme:'greensea',editable:false,support_html:true,view:{engine:'canvas',draggable:true}});
        jm2.show(${JSON.stringify(data)});
        let allExpanded=true;
        document.getElementById('toggle_btn').onclick=()=>{const rootNode=jm2.get_root();if(allExpanded){const collapseNode=(node)=>{if(node&&!node.isroot&&node.children&&node.children.length>0){jm2.collapse_node(node.id);}if(node&&node.children){node.children.forEach(child=>collapseNode(child));}};collapseNode(rootNode);allExpanded=false;}else{const expandNode=(node)=>{if(node&&!node.isroot){jm2.expand_node(node.id);}if(node&&node.children){node.children.forEach(child=>expandNode(child));}};expandNode(rootNode);allExpanded=true;}};
        ${presentationJS}
        ${panAndZoomFnString};
        enablePanAndZoom(document.getElementById('jsmind_container'));
        let isReordered = false;
        document.getElementById('btn_reorder').onclick = () => {
          const root = jm2.get_root();
          if (!root || !root.children || root.children.length < 2) {
            alert('至少需要2個二階節點才能重新排列');
            return;
          }
          isReordered = !isReordered;
          const children = root.children;
          const midpoint = Math.ceil(children.length / 2);
          if (isReordered) {
            for (let i = 0; i < children.length; i++) {
              const direction = i < midpoint ? jsMind.direction.right : jsMind.direction.left;
              children[i].direction = direction;
            }
            alert('已切換為左右排列');
          } else {
            for (const child of children) {
              child.direction = jsMind.direction.right;
            }
            alert('已恢復單側排列');
          }
          jm2.layout.layout();
          jm2.view.show(false);
        };
      </script>
    </body></html>`; 
    const blob = new Blob([html], { type: 'text/html' }); 
    const link = document.createElement('a'); 
    link.href = URL.createObjectURL(blob); 
    link.download = title + '.html'; 
    link.click(); 
  };
  document.getElementById('btn_export_md').onclick = () => { exportToMarkdown(jm); };

  // --- Hyperlink & Image Logic ---

  const buildTopic = (nodeData, cleanTopic) => {
    if (nodeData && nodeData.image_url) {
      return `<a href="${nodeData.image_url}" target="_blank" onclick="event.stopPropagation()" data-image-url="${nodeData.image_url}">🖼️</a> ${cleanTopic}`;
    }
    if (nodeData && nodeData.hyperlink) {
      return `<a href="${nodeData.hyperlink}" target="_blank" onclick="event.stopPropagation()" data-hyperlink="${nodeData.hyperlink}">🔗</a> ${cleanTopic}`;
    }
    return cleanTopic;
  }

  const updateNodeHyperlink = (nodeId, url) => {
    const node = jm.get_node(nodeId);
    if (!node) return;
    if (!node.data) node.data = {};

    if (url && node.data.image_url) {
      showNotification('此節點已有圖片，無法新增超連結', true);
      return;
    }

    if (url) {
      node.data.hyperlink = url;
    } else {
      delete node.data.hyperlink;
    }

    const cleanTopic = getCleanTopic(node.topic);
    const newTopic = buildTopic(node.data, cleanTopic);
    jm.update_node(nodeId, newTopic);
  };

  const updateNodeImage = (nodeId, url) => {
    const node = jm.get_node(nodeId);
    if (!node) return;
    if (!node.data) node.data = {};

    if (url && node.data.hyperlink) {
      showNotification('此節點已有超連結，無法新增圖片', true);
      return;
    }

    if (url) {
      node.data.image_url = url;
    } else {
      delete node.data.image_url;
    }

    const cleanTopic = getCleanTopic(node.topic);
    const newTopic = buildTopic(node.data, cleanTopic);
    jm.update_node(nodeId, newTopic);
  };

  document.getElementById('btn_add_link').onclick = () => {
    const selectedNode = jm.get_selected_node();
    if (!selectedNode) {
      showNotification('請先選取一個節點', true);
      return;
    }
    if (selectedNode.isroot) {
        showNotification('根節點無法設定超連結', true);
        return;
    }
    linkEditingNodeId = selectedNode.id;
    const node = jm.get_node(linkEditingNodeId);
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = node.topic;
    const linkEl = tempDiv.querySelector('a[data-hyperlink]');
    const currentUrl = linkEl ? linkEl.getAttribute('data-hyperlink') : '';

    linkUrlInput.value = currentUrl;
    linkModalOverlay.style.display = 'flex';
    linkUrlInput.focus();
  };

  document.getElementById('btn_cancel_link').onclick = () => {
    linkModalOverlay.style.display = 'none';
    linkEditingNodeId = null;
  };

  document.getElementById('btn_save_link').onclick = () => {
    if (!linkEditingNodeId) return;
    const url = linkUrlInput.value.trim();
    updateNodeHyperlink(linkEditingNodeId, url);
    linkModalOverlay.style.display = 'none';
    linkEditingNodeId = null;
  };

  document.getElementById('btn_add_image').onclick = () => {
    const selectedNode = jm.get_selected_node();
    if (!selectedNode) {
      showNotification('請先選取一個節點', true);
      return;
    }
    if (selectedNode.isroot) {
        showNotification('根節點無法設定圖片', true);
        return;
    }
    imageEditingNodeId = selectedNode.id;
    const node = jm.get_node(imageEditingNodeId);

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = node.topic;
    const imageEl = tempDiv.querySelector('a[data-image-url]');
    const currentUrl = imageEl ? imageEl.getAttribute('data-image-url') : '';

    imageUrlInput.value = currentUrl;
    imageUrlModalOverlay.style.display = 'flex';
    imageUrlInput.focus();
  };

  document.getElementById('btn_cancel_image_url').onclick = () => {
    imageUrlModalOverlay.style.display = 'none';
    imageEditingNodeId = null;
  };

  document.getElementById('btn_save_image_url').onclick = () => {
    if (!imageEditingNodeId) return;
    const url = imageUrlInput.value.trim();
    updateNodeImage(imageEditingNodeId, url);
    imageUrlModalOverlay.style.display = 'none';
    imageEditingNodeId = null;
  };

  // --- Modal Logic ---
  document.getElementById('btn_settings').onclick = () => { gasUrlInput.value = localStorage.getItem('gasWebAppUrl') || ''; settingsModalOverlay.style.display = 'flex'; };
  document.getElementById('btn_cancel_settings').onclick = () => { settingsModalOverlay.style.display = 'none'; };
  document.getElementById('btn_save_settings').onclick = () => { const url = gasUrlInput.value.trim(); if (url) { localStorage.setItem('gasWebAppUrl', url); showNotification('設定已儲存！'); settingsModalOverlay.style.display = 'none'; } else { showNotification('URL 欄位不可為空。', true); } };

  // --- Cloud Modal Filtering ---
  const renderFileList = (files) => {
    cloudFilesList.innerHTML = '';
    if (files.length === 0) {
      cloudFilesList.innerHTML = '<li>沒有符合條件的檔案。</li>';
      return;
    }
    files.forEach(file => {
      const li = document.createElement('li');
      li.dataset.id = file.id;
      const uploader = file.uploader ? `<span>上傳者: ${file.uploader}</span>` : '';
      li.innerHTML = `<div class="file-info" data-id="${file.id}"><div class="file-name">${file.name}</div><div class="file-meta">${uploader}<span>更新時間: ${new Date(file.updateTime).toLocaleString()}</span></div></div><button class="btn btn-delete-cloud" data-id="${file.id}">刪除</button>`;
      cloudFilesList.appendChild(li);
    });
  };

  const applyFilters = () => {
    const selectedUploader = uploaderFilter.value;
    const keyword = keywordFilter.value.toLowerCase();

    let filteredFiles = allCloudFiles;

    if (selectedUploader !== 'all') {
      filteredFiles = filteredFiles.filter(file => file.uploader === selectedUploader);
    }

    if (keyword) {
      filteredFiles = filteredFiles.filter(file => file.name.toLowerCase().includes(keyword));
    }

    renderFileList(filteredFiles);
  };

  uploaderFilter.addEventListener('change', applyFilters);
  keywordFilter.addEventListener('input', applyFilters);

  document.getElementById('btn_open_cloud').onclick = () => {
    const gasUrl = getGasUrl();
    if (!gasUrl) {
      showNotification('請先在「設定」或「說明」中配置 GAS URL。', true);
      return;
    }
    cloudFilesList.innerHTML = '<li>查詢中...</li>';
    cloudFilesModalOverlay.style.display = 'flex';

    fetch(`${gasUrl}?action=getList`)
      .then(res => res.json())
      .then(result => {
        if (result.status !== 'success') throw new Error(result.message);
        
        allCloudFiles = result.data;

        // Populate uploader filter
        const uploaders = ['所有上傳者', ...new Set(allCloudFiles.map(f => f.uploader || '未標示'))];
        uploaderFilter.innerHTML = '';
        uploaders.forEach(u => {
          const option = document.createElement('option');
          option.value = (u === '所有上傳者') ? 'all' : u;
          option.textContent = u;
          uploaderFilter.appendChild(option);
        });
        
        // Reset filters and render initial list
        uploaderFilter.value = 'all';
        keywordFilter.value = '';
        applyFilters();
      })
      .catch(err => {
        cloudFilesList.innerHTML = `<li>讀取失敗: ${err.message}</li>`;
        allCloudFiles = [];
      });
  };
  cloudFilesList.addEventListener('click', e => {
    const target = e.target;
    const gasUrl = getGasUrl();

    // Handle Delete Button Click
    if (target.classList.contains('btn-delete-cloud')) {
      const fileId = target.dataset.id;
      const li = target.closest('li');
      const fileName = li.querySelector('.file-name').textContent;
      
      const password = prompt(`確定要刪除「${fileName}」嗎？\n請輸入密碼 'del' 來確認：`);
      if (password !== 'del') {
        if (password !== null) { showNotification('密碼錯誤，取消刪除。', true); }
        return;
      }

      target.textContent = '刪除中...';
      target.disabled = true;

      fetch(gasUrl, { method: 'POST', body: JSON.stringify({ action: 'deleteMap', id: fileId }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, mode: 'cors' })
      .then(res => res.json()).then(result => {
        if (result.status !== 'success') throw new Error(result.message);
        showNotification(`「${fileName}」已刪除。`);
        li.remove();
      }).catch(err => {
        showNotification(`刪除失敗: ${err.message}`, true);
        target.textContent = '刪除';
        target.disabled = false;
      });

    // Handle Load File Click
    } else {
      const infoDiv = target.closest('.file-info');
      if (!infoDiv || !infoDiv.dataset.id) return;
      const fileId = infoDiv.dataset.id;
      const originalHTML = infoDiv.innerHTML;
      infoDiv.innerHTML += ' (讀取中...)';
      fetch(`${gasUrl}?action=getMap&id=${fileId}`).then(res => res.json()).then(result => {
        if (result.status !== 'success') throw new Error(result.message);
        const mindData = JSON.parse(result.data);
        jm.show(mindData);
        applyLayerColors(jm);
        cloudFilesModalOverlay.style.display = 'none';
        infoDiv.innerHTML = originalHTML;
      }).catch(err => { showNotification(`載入失敗: ${err.message}`, true); infoDiv.innerHTML = originalHTML; });
    }
  });
  document.getElementById('btn_close_cloud_files').onclick = () => { cloudFilesModalOverlay.style.display = 'none'; };

  document.getElementById('btn_save_cloud').onclick = () => { const gasUrl = getGasUrl(); if (!gasUrl) { showNotification('請先在「設定」或「說明」中配置 GAS URL。', true); return; } const mindData = jm.get_data('node_tree'); if (!mindData || !mindData.data) { showNotification('沒有可以儲存的心智圖資料。', true); return; } uploaderNameInput.value = localStorage.getItem('mindMapUploader') || ''; uploaderModalOverlay.style.display = 'flex'; };
  document.getElementById('btn_cancel_uploader').onclick = () => { uploaderModalOverlay.style.display = 'none'; };
  document.getElementById('btn_confirm_uploader').onclick = () => {
    const uploader = uploaderNameInput.value.trim();
    localStorage.setItem('mindMapUploader', uploader);
    uploaderModalOverlay.style.display = 'none';

    const gasUrl = getGasUrl();
    const mindData = jm.get_data('node_tree');
    const mindMapName = (mindData.data.topic || '未命名心智圖').replace(/<[^>]+>/g, '');
    const payload = { action: 'save', name: mindMapName, content: JSON.stringify(mindData), uploader: uploader };
    
    const btn = document.getElementById('btn_save_cloud');
    const originalText = btn.textContent;
    btn.textContent = '儲存中...';
    btn.disabled = true;

    fetch(gasUrl, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, mode: 'cors' })
    .then(response => response.json()).then(data => { if (data.status === 'success') { showNotification(data.message || '成功儲存到雲端！'); } else { throw new Error(data.message || '發生未知的錯誤。'); } })
    .catch(error => { console.error('雲端儲存失敗:', error); showNotification(`儲存失敗: ${error.message}`, true); })
    .finally(() => { btn.textContent = originalText; btn.disabled = false; });
  };

  document.getElementById('btn_help').onclick = () => { helpModalOverlay.style.display = 'flex'; };
  document.getElementById('btn_close_help').onclick = () => { helpModalOverlay.style.display = 'none'; };
  document.getElementById('btn_copy_gas_code').onclick = (e) => {
    const code = document.getElementById('gas_code_block').textContent;
    navigator.clipboard.writeText(code).then(() => {
      showNotification('GAS 程式碼已複製！');
    }, () => {
      showNotification('複製失敗，請手動複製。', true);
    });
  };

  // --- Other Event Listeners ---
  jm.view.container.addEventListener('dblclick', e => {
    const nid = e.target.getAttribute('nodeid');
    if (!nid) return;
    const node = jm.get_node(nid);
    if (!node) return;

    jm.edit_node(nid);
    
    setTimeout(() => {
      const inp = document.querySelector('.jsmind-editor-input');
      if (!inp) return;
      
      // Populate editor with clean text
      inp.value = getCleanTopic(node.topic);

      const blurHandler = () => {
        const newText = marked.parseInline(inp.value);
        const newTopic = buildTopic(node.data, newText);
        jm.update_node(nid, newTopic);
        inp.removeEventListener('blur', blurHandler);
      };

      inp.addEventListener('blur', blurHandler);
    }, 50);
  });

  enablePanAndZoom(document.getElementById('jsmind_container'));

  // --- Keyboard Navigation for Presentation Mode ---
  document.addEventListener('keydown', (e) => {
    if (!isInPresentationMode) return;
    
    switch(e.key) {
      case 'ArrowRight':
      case ' ':
        e.preventDefault();
        nextSlide();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        prevSlide();
        break;
      case 'Escape':
        e.preventDefault();
        exitPresentationMode();
        break;
    }
  });

  // --- Prompt Modal Logic ---
  const promptModalOverlay = document.getElementById('prompt_modal_overlay');
  document.getElementById('btn_show_prompt').onclick = () => {
    promptModalOverlay.style.display = 'flex';
  };
  document.getElementById('btn_close_prompt').onclick = () => {
    promptModalOverlay.style.display = 'none';
  };
  document.getElementById('btn_copy_prompt').onclick = () => {
    const code = document.getElementById('prompt_text_block').textContent;
    navigator.clipboard.writeText(code).then(() => {
      showNotification('Prompt 已複製！');
    }, () => {
      showNotification('複製失敗，請手動複製。', true);
    });
  };
});
