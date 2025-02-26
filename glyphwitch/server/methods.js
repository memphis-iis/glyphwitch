// ...existing code...

/**
 * Add an element to a glyph
 * @param {String} documentId - The document ID
 * @param {Number} pageIndex - The page index
 * @param {Number} lineIndex - The line index
 * @param {Number} wordIndex - The word index
 * @param {Number} glyphIndex - The glyph index
 * @param {Number} x - The x position of the element
 * @param {Number} y - The y position of the element
 * @param {Number} width - The width of the element
 * @param {Number} height - The height of the element
 * @returns {Object} - The result of the operation
 */
'addElementToGlyph': function(documentId, pageIndex, lineIndex, wordIndex, glyphIndex, x, y, width, height) {
  // Validation
  check(documentId, String);
  check(pageIndex, Number);
  check(lineIndex, Number);
  check(wordIndex, Number);
  check(glyphIndex, Number);
  check(x, Number);
  check(y, Number);
  check(width, Number);
  check(height, Number);
  
  // Only allow logged-in users
  if (!this.userId) {
    throw new Meteor.Error('not-authorized', 'You must be logged in to add an element to a glyph');
  }
  
  // Get the document
  const document = Documents.findOne({_id: documentId});
  if (!document) {
    throw new Meteor.Error('document-not-found', 'Document not found');
  }
  
  // Create the element object
  const element = {
    x: x,
    y: y,
    width: width,
    height: height,
    addedBy: this.userId,
    addedOn: new Date()
  };
  
  // Check if the glyph exists and has an elements array
  const page = document.pages[pageIndex];
  const line = page.lines[lineIndex];
  const word = line.words[wordIndex];
  
  // Handle both possible property names (glyphs or glyph)
  const glyphsArray = word.glyphs || word.glyph || [];
  
  // Check if the glyph exists
  if (glyphIndex >= glyphsArray.length) {
    throw new Meteor.Error('glyph-not-found', 'Glyph not found');
  }
  
  // Get the glyph
  const glyph = glyphsArray[glyphIndex];
  
  // Initialize elements array if it doesn't exist
  if (!glyph.elements) {
    glyph.elements = [];
  }
  
  // Add the element to the glyph
  glyph.elements.push(element);
  
  // Update the document
  // Handle both possible property names
  if (word.glyphs) {
    word.glyphs[glyphIndex] = glyph;
  } else if (word.glyph) {
    word.glyph[glyphIndex] = glyph;
  }
  
  // Update the document in the database
  Documents.update({_id: documentId}, {$set: {pages: document.pages}});
  
  return {
    success: true,
    message: 'Element added to glyph'
  };
}

// ...existing code...
