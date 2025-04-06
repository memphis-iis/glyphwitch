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
   * Remove a line from a page
   * @param {String} documentId - Document ID
   * @param {Number|String} pageIndex - Page index
   * @param {Number|String} lineIndex - Line index
   * @returns {Object} - Result object
   */
  removeLine(documentId, pageIndex, lineIndex) {
    check(documentId, String);
    check(pageIndex, Match.OneOf(String, Number));
    check(lineIndex, Match.OneOf(String, Number));
    
    // Convert indices to numbers
    const numPageIndex = parseInt(pageIndex);
    const numLineIndex = parseInt(lineIndex);
    
    if (isNaN(numPageIndex) || isNaN(numLineIndex)) {
      throw new Meteor.Error('invalid-parameters', 'Page and line indices must be valid numbers');
    }
    
    console.log(`Removing line: doc=${documentId}, page=${numPageIndex}, line=${numLineIndex}`);
    
    // Get the document
    const doc = Documents.findOne({ _id: documentId });
    if (!doc) {
      throw new Meteor.Error('not-found', 'Document not found');
    }
    
    // Get the page
    if (!doc.pages || !doc.pages[numPageIndex]) {
      throw new Meteor.Error('not-found', 'Page not found');
    }
    
    // Get the lines array
    if (!doc.pages[numPageIndex].lines) {
      throw new Meteor.Error('not-found', 'No lines found on this page');
    }
    
    // Check if the line exists
    if (!doc.pages[numPageIndex].lines[numLineIndex]) {
      throw new Meteor.Error('not-found', 'Line not found');
    }
    
    // Remove the line from the array
    doc.pages[numPageIndex].lines.splice(numLineIndex, 1);
    
    // Update the document
    Documents.update({ _id: documentId }, { $set: { [`pages.${numPageIndex}.lines`]: doc.pages[numPageIndex].lines } });
    
    return {
      success: true,
      message: 'Line successfully removed'
    };
  },
  
  /**
   * Remove a word from a line
   * @param {String} documentId - Document ID
   * @param {Number|String} pageIndex - Page index
   * @param {Number|String} lineIndex - Line index
   * @param {Number|String} wordIndex - Word index
   * @returns {Object} - Result object
   */
  removeWord(documentId, pageIndex, lineIndex, wordIndex) {
    check(documentId, String);
    check(pageIndex, Match.OneOf(String, Number));
    check(lineIndex, Match.OneOf(String, Number));
    check(wordIndex, Match.OneOf(String, Number));
    
    // Convert indices to numbers
    const numPageIndex = parseInt(pageIndex);
    const numLineIndex = parseInt(lineIndex);
    const numWordIndex = parseInt(wordIndex);
    
    if (isNaN(numPageIndex) || isNaN(numLineIndex) || isNaN(numWordIndex)) {
      throw new Meteor.Error('invalid-parameters', 'Indices must be valid numbers');
    }
    
    console.log(`Removing word: doc=${documentId}, page=${numPageIndex}, line=${numLineIndex}, word=${numWordIndex}`);
    
    // Get the document
    const doc = Documents.findOne({ _id: documentId });
    if (!doc) {
      throw new Meteor.Error('not-found', 'Document not found');
    }
    
    // Get the page
    if (!doc.pages || !doc.pages[numPageIndex]) {
      throw new Meteor.Error('not-found', 'Page not found');
    }
    
    // Get the line
    if (!doc.pages[numPageIndex].lines || !doc.pages[numPageIndex].lines[numLineIndex]) {
      throw new Meteor.Error('not-found', 'Line not found');
    }
    
    // Get the words array
    if (!doc.pages[numPageIndex].lines[numLineIndex].words) {
      throw new Meteor.Error('not-found', 'No words found in this line');
    }
    
    // Check if the word exists
    if (!doc.pages[numPageIndex].lines[numLineIndex].words[numWordIndex]) {
      throw new Meteor.Error('not-found', 'Word not found');
    }
    
    // Remove the word from the array
    doc.pages[numPageIndex].lines[numLineIndex].words.splice(numWordIndex, 1);
    
    // Update the document
    Documents.update(
      { _id: documentId }, 
      { $set: { [`pages.${numPageIndex}.lines.${numLineIndex}.words`]: doc.pages[numPageIndex].lines[numLineIndex].words } }
    );
    
    return {
      success: true,
      message: 'Word successfully removed'
    };
  },
  
  /**
   * Remove a phoneme from a word
   * @param {String} documentId - Document ID
   * @param {Number|String} pageIndex - Page index
   * @param {Number|String} lineIndex - Line index
   * @param {Number|String} wordIndex - Word index
   * @param {Number|String} phonemeIndex - Phoneme index
   * @returns {Object} - Result object
   */
  removePhoneme(documentId, pageIndex, lineIndex, wordIndex, phonemeIndex) {
    check(documentId, String);
    check(pageIndex, Match.OneOf(String, Number));
    check(lineIndex, Match.OneOf(String, Number));
    check(wordIndex, Match.OneOf(String, Number));
    check(phonemeIndex, Match.OneOf(String, Number));
    
    // Convert indices to numbers
    const numPageIndex = parseInt(pageIndex);
    const numLineIndex = parseInt(lineIndex);
    const numWordIndex = parseInt(wordIndex);
    const numPhonemeIndex = parseInt(phonemeIndex);
    
    if (isNaN(numPageIndex) || isNaN(numLineIndex) || isNaN(numWordIndex) || isNaN(numPhonemeIndex)) {
      throw new Meteor.Error('invalid-parameters', 'Indices must be valid numbers');
    }
    
    console.log(`Removing phoneme: doc=${documentId}, page=${numPageIndex}, line=${numLineIndex}, word=${numWordIndex}, phoneme=${numPhonemeIndex}`);
    
    // Get the document
    const doc = Documents.findOne({ _id: documentId });
    if (!doc) {
      throw new Meteor.Error('not-found', 'Document not found');
    }
    
    // Navigate to the word
    if (!doc.pages?.[numPageIndex]?.lines?.[numLineIndex]?.words?.[numWordIndex]) {
      throw new Meteor.Error('not-found', 'Word not found');
    }
    
    const word = doc.pages[numPageIndex].lines[numLineIndex].words[numWordIndex];
    
    // Check if the word has phonemes
    if (!word.phonemes || !word.phonemes[numPhonemeIndex]) {
      throw new Meteor.Error('not-found', 'Phoneme not found');
    }
    
    // Remove the phoneme
    word.phonemes.splice(numPhonemeIndex, 1);
    
    // Update the document
    Documents.update(
      { _id: documentId }, 
      { $set: { [`pages.${numPageIndex}.lines.${numLineIndex}.words.${numWordIndex}.phonemes`]: word.phonemes } }
    );
    
    return {
      success: true,
      message: 'Phoneme successfully removed'
    };
  },
  
  /**
   * Remove a glyph from a word
   * @param {String} documentId - Document ID
   * @param {Number|String} pageIndex - Page index
   * @param {Number|String} lineIndex - Line index
   * @param {Number|String} wordIndex - Word index
   * @param {Number|String} glyphIndex - Glyph index
   * @returns {Object} - Result object
   */
  removeGlyphFromWord(documentId, pageIndex, lineIndex, wordIndex, glyphIndex) {
    check(documentId, String);
    check(pageIndex, Match.OneOf(String, Number));
    check(lineIndex, Match.OneOf(String, Number));
    check(wordIndex, Match.OneOf(String, Number));
    check(glyphIndex, Match.OneOf(String, Number));
    
    // Convert indices to numbers
    const numPageIndex = parseInt(pageIndex);
    const numLineIndex = parseInt(lineIndex);
    const numWordIndex = parseInt(wordIndex);
    const numGlyphIndex = parseInt(glyphIndex);
    
    if (isNaN(numPageIndex) || isNaN(numLineIndex) || isNaN(numWordIndex) || isNaN(numGlyphIndex)) {
      throw new Meteor.Error('invalid-parameters', 'Indices must be valid numbers');
    }
    
    console.log(`Removing glyph: doc=${documentId}, page=${numPageIndex}, line=${numLineIndex}, word=${numWordIndex}, glyph=${numGlyphIndex}`);
    
    // Get the document
    const doc = Documents.findOne({ _id: documentId });
    if (!doc) {
      throw new Meteor.Error('not-found', 'Document not found');
    }
    
    // Navigate to the word
    if (!doc.pages?.[numPageIndex]?.lines?.[numLineIndex]?.words?.[numWordIndex]) {
      throw new Meteor.Error('not-found', 'Word not found');
    }
    
    const word = doc.pages[numPageIndex].lines[numLineIndex].words[numWordIndex];
    
    // Handle both possible glyph property names (glyphs or glyph)
    let glyphsArr, updatePath;
    
    if (word.glyphs) {
      if (!word.glyphs[numGlyphIndex]) {
        throw new Meteor.Error('not-found', 'Glyph not found');
      }
      glyphsArr = word.glyphs;
      updatePath = `pages.${numPageIndex}.lines.${numLineIndex}.words.${numWordIndex}.glyphs`;
    } else if (word.glyph) {
      if (!word.glyph[numGlyphIndex]) {
        throw new Meteor.Error('not-found', 'Glyph not found');
      }
      glyphsArr = word.glyph;
      updatePath = `pages.${numPageIndex}.lines.${numLineIndex}.words.${numWordIndex}.glyph`;
    } else {
      throw new Meteor.Error('not-found', 'No glyphs found in this word');
    }
    
    // Remove the glyph
    glyphsArr.splice(numGlyphIndex, 1);
    
    // Update the document
    const updateObj = {};
    updateObj[updatePath] = glyphsArr;
    
    Documents.update({ _id: documentId }, { $set: updateObj });
    
    return {
      success: true,
      message: 'Glyph successfully removed'
    };
  },
  
  /**
   * Remove an element from a glyph
   * @param {String} documentId - Document ID
   * @param {Number|String} pageIndex - Page index
   * @param {Number|String} lineIndex - Line index
   * @param {Number|String} wordIndex - Word index
   * @param {Number|String} glyphIndex - Glyph index
   * @param {Number|String} elementIndex - Element index
   * @returns {Object} - Result object
   */
  removeElementFromGlyph(documentId, pageIndex, lineIndex, wordIndex, glyphIndex, elementIndex) {
    check(documentId, String);
    check(pageIndex, Match.OneOf(String, Number));
    check(lineIndex, Match.OneOf(String, Number));
    check(wordIndex, Match.OneOf(String, Number));
    check(glyphIndex, Match.OneOf(String, Number));
    check(elementIndex, Match.OneOf(String, Number));
    
    // Convert indices to numbers
    const numPageIndex = parseInt(pageIndex);
    const numLineIndex = parseInt(lineIndex);
    const numWordIndex = parseInt(wordIndex);
    const numGlyphIndex = parseInt(glyphIndex);
    const numElementIndex = parseInt(elementIndex);
    
    if (isNaN(numPageIndex) || isNaN(numLineIndex) || isNaN(numWordIndex) || 
        isNaN(numGlyphIndex) || isNaN(numElementIndex)) {
      throw new Meteor.Error('invalid-parameters', 'Indices must be valid numbers');
    }
    
    console.log(`Removing element: doc=${documentId}, page=${numPageIndex}, line=${numLineIndex}, word=${numWordIndex}, glyph=${numGlyphIndex}, element=${numElementIndex}`);
    
    // Get the document
    const doc = Documents.findOne({ _id: documentId });
    if (!doc) {
      throw new Meteor.Error('not-found', 'Document not found');
    }
    
    // Navigate to the word
    if (!doc.pages?.[numPageIndex]?.lines?.[numLineIndex]?.words?.[numWordIndex]) {
      throw new Meteor.Error('not-found', 'Word not found');
    }
    
    const word = doc.pages[numPageIndex].lines[numLineIndex].words[numWordIndex];
    
    // Handle both possible glyph property names
    let glyph, updatePath;
    
    if (word.glyphs && word.glyphs[numGlyphIndex]) {
      glyph = word.glyphs[numGlyphIndex];
      updatePath = `pages.${numPageIndex}.lines.${numLineIndex}.words.${numWordIndex}.glyphs.${numGlyphIndex}.elements`;
    } else if (word.glyph && word.glyph[numGlyphIndex]) {
      glyph = word.glyph[numGlyphIndex];
      updatePath = `pages.${numPageIndex}.lines.${numLineIndex}.words.${numWordIndex}.glyph.${numGlyphIndex}.elements`;
    } else {
      throw new Meteor.Error('not-found', 'Glyph not found');
    }
    
    // Check if the glyph has elements
    if (!glyph.elements || !glyph.elements[numElementIndex]) {
      throw new Meteor.Error('not-found', 'Element not found');
    }
    
    // Remove the element
    glyph.elements.splice(numElementIndex, 1);
    
    // Update the document
    const updateObj = {};
    updateObj[updatePath] = glyph.elements;
    
    Documents.update({ _id: documentId }, { $set: updateObj });
    
    return {
      success: true,
      message: 'Element successfully removed'
    };
  }
});