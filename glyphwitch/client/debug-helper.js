// New file with helper functions for debugging the collapse behavior

// Function to check and report on all collapse elements
window.checkAllCollapseElements = function() {
  console.group('CHECKING ALL COLLAPSE ELEMENTS');
  
  $('.file-tree [data-bs-toggle="collapse"]').each(function(i) {
    const $this = $(this);
    const targetId = $this.attr('href');
    const $target = $(targetId);
    
    const ariaExpanded = $this.attr('aria-expanded');
    const hasShowClass = $target.hasClass('show');
    
    console.group(`Element #${i}: ${$this.text().trim()}`);
    console.log('Element:', this);
    console.log('Target:', $target[0]);
    console.log('aria-expanded:', ariaExpanded);
    console.log('Has .show class:', hasShowClass);
    
    if ((ariaExpanded === 'true') !== hasShowClass) {
      console.warn('⚠️ INCONSISTENCY DETECTED!');
    }
    
    console.groupEnd();
  });
  
  console.groupEnd();
};

// Function to fix any inconsistent states
window.fixInconsistentStates = function() {
  console.group('FIXING INCONSISTENT STATES');
  let fixCount = 0;
  
  $('.file-tree [data-bs-toggle="collapse"]').each(function(i) {
    const $this = $(this);
    const targetId = $this.attr('href');
    const $target = $(targetId);
    
    const ariaExpanded = $this.attr('aria-expanded');
    const hasShowClass = $target.hasClass('show');
    
    if ((ariaExpanded === 'true') !== hasShowClass) {
      console.log(`Fixing inconsistency for element ${i}`);
      
      // Always trust the visual state (.show class)
      if (hasShowClass) {
        this.setAttribute('aria-expanded', 'true');
      } else {
        this.setAttribute('aria-expanded', 'false');
      }
      
      fixCount++;
    }
  });
  
  console.log(`Fixed ${fixCount} inconsistencies`);
  console.groupEnd();
};

// Add these to the window for easy console access
console.log('Debug helper functions loaded. Use window.checkAllCollapseElements() and window.fixInconsistentStates() in console.');
