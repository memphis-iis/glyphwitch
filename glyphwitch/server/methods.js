import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Match } from 'meteor/check';

Meteor.methods({

  /**
   * Add a new element to a glyph
   * @param {String} document - Document ID
   * @param {Number|String} page - Page index
   * @param {Number|String} line - Line index
   * @param {Number|String} word - Word index
   * @param {Number|String} glyph - Glyph index
   * @param {Number|String} x - X coordinate
   * @param {Number|String} y - Y coordinate
   * @param {Number|String} width - Width
   * @param {Number|String} height - Height
   * @returns {Object} - Result object
   */
  addElementToGlyph(document, page, line, word, glyph, x, y, width, height) {
    // Log received parameters to debug
    console.log("addElementToGlyph received params:", {
      document, page, line, word, glyph, x, y, width, height
    });
    
    // Check document is a string
    check(document, String);
    
    // Check and convert indices - accept both strings and numbers
    check(page, Match.OneOf(String, Number));
    check(line, Match.OneOf(String, Number));
    check(word, Match.OneOf(String, Number));
    check(glyph, Match.OneOf(String, Number));
    
    // Check and convert coordinate values - accept both strings and numbers
    check(x, Match.OneOf(String, Number));
    check(y, Match.OneOf(String, Number));
    check(width, Match.OneOf(String, Number));
    check(height, Match.OneOf(String, Number));

    // Convert all numeric parameters to actual numbers
    const numPage = parseInt(page);
    const numLine = parseInt(line);
    const numWord = parseInt(word);
    const numGlyph = parseInt(glyph);
    const numX = parseFloat(x);
    const numY = parseFloat(y);
    const numWidth = parseFloat(width);
    const numHeight = parseFloat(height);
    
    // Validate all parsed values are actual numbers
    if (isNaN(numPage) || isNaN(numLine) || isNaN(numWord) || isNaN(numGlyph) ||
        isNaN(numX) || isNaN(numY) || isNaN(numWidth) || isNaN(numHeight)) {
      throw new Meteor.Error('invalid-parameters', 'All numeric parameters must be valid numbers');
    }
    
    // Create the element object with parsed numeric values
    const element = {
      x: numX,
      y: numY,
      width: numWidth,
      height: numHeight,
      addedAt: new Date(),
      addedBy: this.userId || 'anonymous'
    };

    console.log(`Adding element to glyph: doc=${document}, page=${numPage}, line=${numLine}, word=${numWord}, glyph=${numGlyph}`);
    console.log('Element:', element);

    // Get the document
    const doc = Documents.findOne({ _id: document });
    if (!doc) {
      throw new Meteor.Error('not-found', 'Document not found');
    }

    // Get the page
    if (!doc.pages || !doc.pages[numPage]) {
      throw new Meteor.Error('not-found', 'Page not found');
    }

    // Get the line
    if (!doc.pages[numPage].lines || !doc.pages[numPage].lines[numLine]) {
      throw new Meteor.Error('not-found', 'Line not found');
    }

    // Get the word
    if (!doc.pages[numPage].lines[numLine].words || !doc.pages[numPage].lines[numLine].words[numWord]) {
      throw new Meteor.Error('not-found', 'Word not found');
    }

    // Check if the word has glyphs property (could be glyphs or glyph)
    const wordObj = doc.pages[numPage].lines[numLine].words[numWord];
    let glyphsArr = wordObj.glyphs || wordObj.glyph || [];

    // Check if the glyph exists
    if (!glyphsArr[numGlyph]) {
      throw new Meteor.Error('not-found', 'Glyph not found');
    }

    // Create elements array if it doesn't exist
    if (!glyphsArr[numGlyph].elements) {
      glyphsArr[numGlyph].elements = [];
    }

    // Add the element
    glyphsArr[numGlyph].elements.push(element);

    // Update the document
    // First, determine which property to update (glyphs or glyph)
    const updatePath = wordObj.glyphs ? 
      `pages.${numPage}.lines.${numLine}.words.${numWord}.glyphs.${numGlyph}.elements` : 
      `pages.${numPage}.lines.${numLine}.words.${numWord}.glyph.${numGlyph}.elements`;

    const updateObj = {};
    updateObj[updatePath] = glyphsArr[numGlyph].elements;

    Documents.update({ _id: document }, { $set: updateObj });

    return {
      success: true,
      elementId: glyphsArr[numGlyph].elements.length - 1
    };
  },

  /**
   * Insert a page after a specific page in a document
   * @param {String} documentId - Document ID
   * @param {String} fileId - File ID of the page image
   * @param {Number|String} insertAfter - Page index to insert after
   * @param {String} title - Page title
   * @returns {Object} - Result object
   */
  insertPage(documentId, fileId, insertAfter, title) {
    check(documentId, String);
    check(fileId, String);
    check(insertAfter, Match.OneOf(String, Number));
    check(title, String);
    
    console.log(`Inserting page after ${insertAfter} in document ${documentId}`);
    
    // Get the document
    const doc = Documents.findOne({ _id: documentId });
    if (!doc) {
      throw new Meteor.Error('not-found', 'Document not found');
    }
    
    // Create the new page
    const newPage = {
      title: title || `Page ${doc.pages.length + 1}`,
      pageId: fileId,
      addedAt: new Date(),
      addedBy: this.userId || 'anonymous',
      lines: []
    };
    
    // Convert insertAfter to a number
    const insertPosition = parseInt(insertAfter);
    
    if (isNaN(insertPosition) || insertPosition < 0 || insertPosition >= doc.pages.length) {
      throw new Meteor.Error('invalid-position', 'Invalid position for page insertion');
    }
    
    // Insert after the specified position
    doc.pages.splice(insertPosition + 1, 0, newPage);
    
    // Update the document
    Documents.update({ _id: documentId }, { $set: { pages: doc.pages } });
    
    return {
      success: true,
      pageCount: doc.pages.length
    };
  },
});