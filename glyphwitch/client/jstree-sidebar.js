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

export function debugJsTreeEvents() {
  console.group('DEBUG: jsTree Event Bindings');
  
  // Safely check if our handler is registered
  try {
    const documentEvents = $._data && $(document)[0] ? $._data($(document)[0], 'events') || {} : {};
    console.log('Document-level event handlers:', documentEvents);
    
    const treeEl = $('#documentTree')[0];
    const treeEvents = treeEl && $._data ? $._data(treeEl, 'events') || {} : {};
    console.log('Direct tree event handlers:', treeEvents);
    
    // Test by manually triggering an event
    console.log('Attempting to manually trigger select_node.jstree event');
    $('#documentTree').trigger('select_node.jstree', [{ node: { id: 'test-node', data: { type: 'page', index: 0 } } }]);
  } catch (err) {
    console.error('Error in debugJsTreeEvents:', err);
  }
  
  console.groupEnd();
}

// Helper function to handle element selection actions
function handleElementSelection(type, index, instance) {
  console.log(`Handling element selection: ${type} at index ${index}`);
  
  // If the instance doesn't have tabGroups, we can't proceed
  if (!instance || !instance.tabGroups) {
    console.warn('Template instance or tabGroups not available');
    return;
  }
  
  // Select the appropriate tab based on element type
  switch (type) {
    case 'word':
      // Activate word tab
      instance.tabGroups.editorTabs.set('word');
      console.log('Activated word tab');
      break;
    case 'phoneme':
      // Activate phoneme tab
      instance.tabGroups.editorTabs.set('phoneme');
      console.log('Activated phoneme tab');
      break;
    case 'glyph':
      // Activate glyph tab
      instance.tabGroups.editorTabs.set('glyph');
      console.log('Activated glyph tab');
      break;
    case 'element':
      // Activate element tab
      instance.tabGroups.editorTabs.set('element');
      console.log('Activated element tab');
      break;
  }
}

async function initDocumentTree(documentId) {
  console.group('DEBUG: jsTree Initialization');
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
    if ($.jstree && $.jstree.reference('#documentTree')) {
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
    
    // IMPORTANT: Single event binding for node selection
    $('#documentTree').off('select_node.jstree').on('select_node.jstree', function(e, data) {
      console.log("Node selected:", data.node);
      
      // Extract node data, checking multiple possible locations
      let nodeData;
      if (data.node.original && data.node.original.data) {
        // Data might be in the original node data
        nodeData = data.node.original.data;
      } else if (data.node.data) {
        // Data might be directly on the node
        nodeData = data.node.data;
      } else {
        // Try to extract data from the node ID for basic page selection
        const idMatch = data.node.id.match(/^page-(\d+)/);
        if (idMatch) {
          nodeData = {
            type: 'page',
            index: parseInt(idMatch[1], 10)
          };
          console.log("Created node data from ID:", nodeData);
        }
      }
      
      if (!nodeData) {
        console.warn("No node data found in selection");
        return;
      }
      
      // Find the appropriate template instance using a more reliable method
      let instance;
      
      try {
        // Try multiple methods to get the template instance
        if (Template && Template.instance) {
          instance = Template.instance();
        }
        
        if (!instance && Blaze && Blaze.getView) {
          const treeElement = $('#documentTree')[0];
          if (treeElement) {
            const view = Blaze.getView(treeElement);
            if (view) {
              instance = view.templateInstance();
            }
          }
        }
        
        if (!instance) {
          // Last resort - search upwards through parents
          const parentTemplate = $('#documentTree').closest('[id^=Template]')[0];
          if (parentTemplate && Blaze && Blaze.getView) {
            const view = Blaze.getView(parentTemplate);
            if (view) {
              instance = view.templateInstance();
            }
          }
        }
        
        // Try another approach - get the template from a known global object
        if (!instance && window.ViewPage && window.ViewPage.templateInstance) {
          instance = window.ViewPage.templateInstance;
        }
      } catch (err) {
        console.error("Error finding template instance:", err);
      }
      
      if (!instance) {
        console.error("Could not find template instance for node selection");
        return;
      }
      
      console.log("Found template instance:", instance);
      
      // Update reactive variables based on node type
      switch (nodeData.type) {
        case 'page':
          instance.currentPage.set(nodeData.index);
          console.log("Set current page to:", nodeData.index);
          break;
        case 'line':
          instance.currentPage.set(nodeData.pageIndex);
          instance.currentLine.set(nodeData.index);
          console.log("Set current line to:", nodeData.index, "on page:", nodeData.pageIndex);
          break;
        case 'word':
          instance.currentPage.set(nodeData.pageIndex);
          instance.currentLine.set(nodeData.lineIndex);
          instance.currentWord.set(nodeData.index);
          console.log("Set current word to:", nodeData.index, "on line:", nodeData.lineIndex, "page:", nodeData.pageIndex);
          
          // If tabGroups exists, select the word tab
          if (instance.tabGroups && instance.tabGroups.editorTabs) {
            instance.tabGroups.editorTabs.set('word');
            console.log("Activated word tab");
          }
          break;
        case 'phoneme':
          instance.currentPage.set(nodeData.pageIndex);
          instance.currentLine.set(nodeData.lineIndex);
          instance.currentWord.set(nodeData.wordIndex);
          instance.currentPhoneme.set(nodeData.index);
          console.log("Set current phoneme to:", nodeData.index, "in word:", nodeData.wordIndex);
          
          // If tabGroups exists, select the word tab first, then phoneme tab after a delay
          if (instance.tabGroups && instance.tabGroups.editorTabs) {
            instance.tabGroups.editorTabs.set('word');
            setTimeout(() => {
              instance.tabGroups.editorTabs.set('phoneme');
              console.log("Activated phoneme tab");
            }, 300);
          }
          break;
        case 'glyph':
          instance.currentPage.set(nodeData.pageIndex);
          instance.currentLine.set(nodeData.lineIndex);
          instance.currentWord.set(nodeData.wordIndex);
          instance.currentGlyph.set(nodeData.index);
          console.log("Set current glyph to:", nodeData.index, "in word:", nodeData.wordIndex);
          
          // If tabGroups exists, select the word tab first, then glyph tab after a delay
          if (instance.tabGroups && instance.tabGroups.editorTabs) {
            instance.tabGroups.editorTabs.set('word');
            setTimeout(() => {
              instance.tabGroups.editorTabs.set('glyph');
              console.log("Activated glyph tab");
            }, 300);
          }
          break;
        case 'element':
          instance.currentPage.set(nodeData.pageIndex);
          instance.currentLine.set(nodeData.lineIndex);
          instance.currentWord.set(nodeData.wordIndex);
          instance.currentGlyph.set(nodeData.glyphIndex);
          if (instance.currentElement) {
            instance.currentElement.set(nodeData.index);
          } else {
            console.warn("currentElement reactive var not found, creating it");
            instance.currentElement = new ReactiveVar(nodeData.index);
          }
          console.log("Set current element to:", nodeData.index, "in glyph:", nodeData.glyphIndex);
          
          // If tabGroups exists, navigate through tabs with delays
          if (instance.tabGroups && instance.tabGroups.editorTabs) {
            instance.tabGroups.editorTabs.set('word');
            setTimeout(() => {
              instance.tabGroups.editorTabs.set('glyph');
              setTimeout(() => {
                instance.tabGroups.editorTabs.set('element');
                console.log("Activated element tab");
              }, 300);
            }, 300);
          }
          break;
      }
    });
    
    // Call debug function after initialization
    setTimeout(() => {
      debugJsTreeEvents();
    }, 1000);
    
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
  
  console.groupEnd();
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