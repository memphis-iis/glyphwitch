import { ScriptLoader } from './lib/script-loader.js';

function documentToJsTreeData(doc) {
  if (!doc || !doc.pages) return [];
  const result = [];
  doc.pages.forEach((page, pIdx) => {
    const pageNode = {
      id: `page-${pIdx}`,
      text: `Page ${pIdx + 1}${page.title ? ' - ' + page.title : ''}`,
      icon: 'bi bi-folder-fill',
      state: { opened: false },
      data: { type: 'page', index: pIdx },
      children: []
    };
    if (page.lines && page.lines.length) {
      page.lines.forEach((line, lIdx) => {
        const lineNode = {
          id: `page-${pIdx}-line-${lIdx}`,
          text: `Line ${lIdx + 1}`,
          icon: 'bi bi-list',
          data: { type: 'line', pageIndex: pIdx, index: lIdx },
          children: []
        };
        line.words && line.words.forEach((word, wIdx) => {
          const wordNode = {
            id: `page-${pIdx}-line-${lIdx}-word-${wIdx}`,
            text: `Word ${wIdx + 1}`,
            icon: 'bi bi-file-word-fill',
            data: { type: 'word', pageIndex: pIdx, lineIndex: lIdx, index: wIdx },
            children: []
          };
          
          // Add phonemes as children of the word
          if (word.phonemes && word.phonemes.length) {
            word.phonemes.forEach((phoneme, phIdx) => {
              const phonemeNode = {
                id: `page-${pIdx}-line-${lIdx}-word-${wIdx}-phoneme-${phIdx}`,
                text: `Phoneme ${phIdx + 1}${phoneme.ipa ? ' - ' + phoneme.ipa : ''}`,
                icon: 'bi bi-soundwave',
                data: { 
                  type: 'phoneme', 
                  pageIndex: pIdx, 
                  lineIndex: lIdx, 
                  wordIndex: wIdx, 
                  index: phIdx 
                },
                children: []
              };
              wordNode.children.push(phonemeNode);
            });
          }
          
          // Add glyphs as children of the word (handle both .glyphs and .glyph properties)
          const glyphsArray = word.glyphs || word.glyph || [];
          if (glyphsArray.length) {
            glyphsArray.forEach((glyph, glIdx) => {
              const glyphNode = {
                id: `page-${pIdx}-line-${lIdx}-word-${wIdx}-glyph-${glIdx}`,
                text: `Glyph ${glIdx + 1}`,
                icon: 'bi bi-file-earmark-font',
                data: { 
                  type: 'glyph', 
                  pageIndex: pIdx, 
                  lineIndex: lIdx, 
                  wordIndex: wIdx, 
                  index: glIdx 
                },
                children: []
              };
              
              // Add elements as children of the glyph if they exist
              if (glyph.elements && glyph.elements.length) {
                glyph.elements.forEach((element, elIdx) => {
                  const elementNode = {
                    id: `page-${pIdx}-line-${lIdx}-word-${wIdx}-glyph-${glIdx}-element-${elIdx}`,
                    text: `Element ${elIdx + 1}`,
                    icon: 'bi bi-bounding-box',
                    data: { 
                      type: 'element', 
                      pageIndex: pIdx, 
                      lineIndex: lIdx, 
                      wordIndex: wIdx, 
                      glyphIndex: glIdx, 
                      index: elIdx 
                    },
                    children: []
                  };
                  glyphNode.children.push(elementNode);
                });
              }
              
              wordNode.children.push(glyphNode);
            });
          }
          
          lineNode.children.push(wordNode);
        });
        pageNode.children.push(lineNode);
      });
    }
    result.push(pageNode);
  });
  return result;
}

async function initDocumentTree(documentId) {
  console.log("Initializing jsTree for document:", documentId);
  
  if (!documentId) {
    console.error("No document ID provided to initDocumentTree");
    return;
  }
  
  // Ensure jQuery and jsTree are available before proceeding
  try {
    await ScriptLoader.ensureJsTree();
  } catch (error) {
    console.error("Failed to load jsTree:", error);
    $('#documentTree').html(`
      <div class="alert alert-danger">
        <strong>Error:</strong> Could not load jsTree library. 
        <button class="btn btn-sm btn-warning mt-2" id="retryJsTree">Retry</button>
      </div>
    `);
    
    $('#retryJsTree').on('click', () => {
      $('#documentTree').html('<div class="p-3 text-center">Retrying jsTree load...</div>');
      initDocumentTree(documentId);
    });
    
    return;
  }
  
  // Check if #documentTree exists in DOM
  if ($('#documentTree').length === 0) {
    console.error("#documentTree element not found in DOM");
    return;
  }
  
  const doc = Documents.findOne({ _id: documentId });
  if (!doc) {
    console.error("Document not found:", documentId);
    $('#documentTree').html('<div class="alert alert-warning">Document not found</div>');
    return;
  }
  
  console.log("Document found:", doc.title);
  
  // Debug Data Browser
  console.log(`Document has ${doc.pages ? doc.pages.length : 0} pages`);
  if (doc.pages && doc.pages.length > 0) {
    console.log(`First page has ${doc.pages[0].lines ? doc.pages[0].lines.length : 0} lines`);
  }
  
  const treeData = documentToJsTreeData(doc);
  console.log("jsTree data prepared:", treeData);
  
  // Make sure the tree container is visible
  $('#documentTree').css({
    'min-height': '200px',
    'border': '1px dashed #ccc',
    'margin': '10px 0',
    'padding': '5px',
    'overflow': 'auto'
  });
  
  // Clear any existing content
  $('#documentTree').empty();
  
  // Add a placeholder while loading
  $('#documentTree').html('<div class="p-3 text-center">Loading tree...</div>');
  
  try {
    // Clean up any existing instances
    if ($.jstree.reference('#documentTree')) {
      $('#documentTree').jstree('destroy');
    }
    
    // Create the tree with a shorter timeout since we've already ensured scripts are loaded
    console.log("Creating new jsTree instance");
    $('#documentTree')
      .on('loaded.jstree', function() {
        console.log("jsTree loaded event fired");
      })
      .on('ready.jstree', function() {
        console.log("jsTree ready event fired");
        // Ensure first-level nodes are visible
        setTimeout(() => {
          const tree = $.jstree.reference('#documentTree');
          if (tree) {
            const rootNodes = tree.get_node('#').children;
            if (rootNodes && rootNodes.length > 0) {
              tree.open_node(rootNodes[0]);
            }
          }
        }, 100);
      })
      .jstree({
        core: {
          themes: {
            name: 'default',
            dots: true,
            icons: true,
            variant: 'large',
            stripes: false
          },
          data: treeData,
          check_callback: true 
        },
        plugins: ['types', 'wholerow', 'state'],
        types: {
          default: { icon: 'bi bi-file' },
          page: { icon: 'bi bi-folder-fill' },
          line: { icon: 'bi bi-list' },
          word: { icon: 'bi bi-file-word-fill' },
          phoneme: { icon: 'bi bi-soundwave' },
          glyph: { icon: 'bi bi-file-earmark-font' },
          element: { icon: 'bi bi-bounding-box' }
        },
        state: { key: 'glyphwitch-document-' + documentId }
      });
    
    // Handle node selection
    $('#documentTree').off('select_node.jstree').on('select_node.jstree', function(e, data) {
      console.log("Node selected:", data.node);
      const node = data.node.original.data;
      if (!node) return;
      
      // Find the appropriate template instance using a more reliable method
      let instance;
      
      try {
        instance = Blaze.getView($('#documentTree')[0]).templateInstance();
      } catch (e) {
        console.log("Error finding template instance from Blaze, trying Template.instance()");
        instance = Template.instance();
      }
      
      if (!instance) {
        // Last resort - search for Template instance in parent elements
        const view = Blaze.getView($('#documentTree').closest('[id^=Template]')[0]);
        if (view) instance = view.templateInstance();
      }
      
      if (!instance) {
        console.error("Could not find template instance for node selection");
        return;
      }
      
      // Update reactive variables based on node type
      switch (node.type) {
        case 'page':
          instance.currentPage.set(node.index);
          console.log("Set current page to:", node.index);
          break;
        case 'line':
          instance.currentPage.set(node.pageIndex);
          instance.currentLine.set(node.index);
          console.log("Set current line to:", node.index, "on page:", node.pageIndex);
          break;
        case 'word':
          instance.currentPage.set(node.pageIndex);
          instance.currentLine.set(node.lineIndex);
          instance.currentWord.set(node.index);
          console.log("Set current word to:", node.index, "on line:", node.lineIndex, "page:", node.pageIndex);
          break;
        case 'phoneme':
          instance.currentPage.set(node.pageIndex);
          instance.currentLine.set(node.lineIndex);
          instance.currentWord.set(node.wordIndex);
          instance.currentPhoneme.set(node.index);
          console.log("Set current phoneme to:", node.index, "in word:", node.wordIndex, "line:", node.lineIndex, "page:", node.pageIndex);
          break;
        case 'glyph':
          instance.currentPage.set(node.pageIndex);
          instance.currentLine.set(node.lineIndex);
          instance.currentWord.set(node.wordIndex);
          instance.currentGlyph.set(node.index);
          console.log("Set current glyph to:", node.index, "in word:", node.wordIndex, "line:", node.lineIndex, "page:", node.pageIndex);
          break;
        case 'element':
          instance.currentPage.set(node.pageIndex);
          instance.currentLine.set(node.lineIndex);
          instance.currentWord.set(node.wordIndex);
          instance.currentGlyph.set(node.glyphIndex);
          if (instance.currentElement) {
            instance.currentElement.set(node.index);
          } else {
            console.warn("currentElement reactive var not found, creating it");
            instance.currentElement = new ReactiveVar(node.index);
          }
          console.log("Set current element to:", node.index, "in glyph:", node.glyphIndex, "word:", node.wordIndex);
          break;
      }
      
      // If this is phoneme/glyph/element, automatically open the correct view tab
      if (node.type === 'phoneme' || node.type === 'glyph' || node.type === 'element') {
        // First select the word to ensure proper tab chain
        if (node.type === 'phoneme' || node.type === 'glyph') {
          // Open word tab first (simulates clicking on word first)
          handleElementSelection('word', node.wordIndex, instance);
          
          // Wait for word tab and related content to be visible
          Meteor.setTimeout(() => {
            // Now open the phoneme/glyph tab
            handleElementSelection(node.type, node.index, instance);
          }, 300);
        } else if (node.type === 'element') {
          // Navigate through the full path: word → glyph → element
          handleElementSelection('word', node.wordIndex, instance);
          
          Meteor.setTimeout(() => {
            handleElementSelection('glyph', node.glyphIndex, instance);
            
            Meteor.setTimeout(() => {
              handleElementSelection('element', node.index, instance);
            }, 300);
          }, 300);
        }
      }
    });
  } catch (error) {
    console.error("Error initializing jsTree:", error);
    $('#documentTree').html(`
      <div class="alert alert-danger">
        Error initializing document tree: ${error.message}
        <button class="btn btn-sm btn-warning mt-2" id="retryInit">Retry</button>
      </div>
    `);
    
    $('#retryInit').on('click', function() {
      $('#documentTree').html('<div class="p-3 text-center">Retrying initialization...</div>');
      initDocumentTree(documentId);
    });
  }
}

function addTreeButtonHandlers() {
  $('#expandAll').off('click').on('click', () => { 
    console.log("Expanding all nodes");
    $('#documentTree').jstree('open_all'); 
  });
  
  $('#collapseAll').off('click').on('click', () => { 
    console.log("Collapsing all nodes");
    $('#documentTree').jstree('close_all'); 
  });
  
  $('#refreshTree').off('click').on('click', () => {
    console.log("Refreshing tree");
    const instance = Template.instance() || 
                   Blaze.getView(document.getElementById('documentTree')).templateInstance();
    if (instance && instance.currentDocument && instance.currentDocument.get()) {
      initDocumentTree(instance.currentDocument.get());
    }
  });
}

export { initDocumentTree, addTreeButtonHandlers, ScriptLoader };