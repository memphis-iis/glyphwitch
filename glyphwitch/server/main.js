import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import './collections';

Meteor.startup(() => {
  // welcome message
  console.log('*** GlyphWitch Server ***');
  console.log('Welcome to the GlyphWitch server!');
  //setup roles, admin and user
  if (Meteor.roles.find().count() == 0) {
    console.log('Creating roles');
    Roles.createRole('admin');
    Roles.createRole('user');
  }
  //if there are no admin users, create one with the email 'admin' and the password 'admin'
  if (Meteor.users.find({roles: 'admin'}).count() == 0) {
    //if no admin exists but the admin user does, set the admin role
    if (Meteor.users.findOne({username: 'admin'})) {
      console.log('Setting admin role for user with email "admin"');
      Roles.addUsersToRoles(Meteor.users.findOne({username: 'admin'}), 'admin');
    } else {
      //if no admin user exists, create one
      console.log('Creating admin user with email "admin" and password "admin"');
      Accounts.createUser({
        email: 'admin@example.com',
        password: 'admin',
        username: 'admin'
      });
      Roles.addUsersToRoles(Meteor.users.findOne({username: 'admin'}), 'admin');
    }
  }
});

Meteor.methods({
  // Add this method to handle item deletion with comprehensive debugging
  deleteDocumentItem: function(documentId, itemType, path) {
    console.group(`SERVER: Delete Document Item - ${itemType} at path [${path.join(',')}]`);
    console.time('deleteDocumentItem');
    
    try {
      // Check if user is logged in
      if (!this.userId) {
        console.error('Authentication error: User not logged in');
        console.groupEnd();
        throw new Meteor.Error('not-authorized', 'You must be logged in to delete items');
      }
      
      console.log(`User ${this.userId} is attempting to delete ${itemType} at path [${path.join(',')}] from document ${documentId}`);
      
      // Get the document
      const document = Documents.findOne({ _id: documentId });
      if (!document) {
        console.error(`Document not found: ${documentId}`);
        console.groupEnd();
        throw new Meteor.Error('not-found', 'Document not found');
      }
      
      // Log the current document structure (truncated)
      console.log('Document before deletion:', {
        _id: document._id,
        title: document.title,
        pageCount: document.pages ? document.pages.length : 0
      });
      
      // Make a copy of the document to modify
      let docCopy = JSON.parse(JSON.stringify(document)); // Deep clone
      
      // Log the document structure relevant to the deletion path
      console.log('Traversing document structure...');
      console.log(`Item type: ${itemType}, Path: [${path.join(',')}]`);
      
      // Handle different item types
      let deletedItem = null;
      let parentArray = null;
      let deleteIndex = -1;
      
      switch (itemType) {
        case 'page':
          // Delete a page
          const pageIndex = path[0];
          console.log(`Processing page deletion at index ${pageIndex}`);
          
          if (!docCopy.pages || pageIndex >= docCopy.pages.length) {
            console.error(`Page index out of bounds: ${pageIndex}, pages length: ${docCopy.pages ? docCopy.pages.length : 0}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Page not found');
          }
          
          // Store the page ID before deletion for cleanup
          const pageId = docCopy.pages[pageIndex].pageId;
          console.log(`Found page to delete with ID: ${pageId}`);
          
          // Log the page structure before deletion
          console.log('Page before deletion:', {
            pageId: docCopy.pages[pageIndex].pageId,
            title: docCopy.pages[pageIndex].title,
            linesCount: docCopy.pages[pageIndex].lines ? docCopy.pages[pageIndex].lines.length : 0
          });
          
          // Store the deleted item
          deletedItem = docCopy.pages[pageIndex];
          parentArray = docCopy.pages;
          deleteIndex = pageIndex;
          
          // Remove the page
          docCopy.pages.splice(pageIndex, 1);
          console.log(`Page at index ${pageIndex} removed from document`);
          
          // Remove the page image from Files collection if it exists
          if (pageId) {
            Files.remove({ _id: pageId });
            console.log(`Associated page image with ID ${pageId} removed from Files collection`);
          }
          break;
          
        case 'line':
          // Delete a line
          const linePageIndex = path[0];
          const lineIndex = path[1];
          console.log(`Processing line deletion at page ${linePageIndex}, line ${lineIndex}`);
          
          // Validate the path
          if (!docCopy.pages || linePageIndex >= docCopy.pages.length) {
            console.error(`Page index out of bounds: ${linePageIndex}, pages length: ${docCopy.pages ? docCopy.pages.length : 0}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Page not found for line deletion');
          }
          
          if (!docCopy.pages[linePageIndex].lines || lineIndex >= docCopy.pages[linePageIndex].lines.length) {
            console.error(`Line index out of bounds: ${lineIndex}, lines length: ${docCopy.pages[linePageIndex].lines ? docCopy.pages[linePageIndex].lines.length : 0}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Line not found');
          }
          
          // Log the line structure before deletion
          console.log('Line before deletion:', {
            x1: docCopy.pages[linePageIndex].lines[lineIndex].x1,
            y1: docCopy.pages[linePageIndex].lines[lineIndex].y1,
            width: docCopy.pages[linePageIndex].lines[lineIndex].width,
            height: docCopy.pages[linePageIndex].lines[lineIndex].height,
            wordsCount: docCopy.pages[linePageIndex].lines[lineIndex].words ? docCopy.pages[linePageIndex].lines[lineIndex].words.length : 0
          });
          
          // Store the deleted item
          deletedItem = docCopy.pages[linePageIndex].lines[lineIndex];
          parentArray = docCopy.pages[linePageIndex].lines;
          deleteIndex = lineIndex;
          
          // Remove the line
          docCopy.pages[linePageIndex].lines.splice(lineIndex, 1);
          console.log(`Line at index ${lineIndex} removed from page ${linePageIndex}`);
          break;
          
        case 'word':
          // Delete a word
          const wordPageIndex = path[0];
          const wordLineIndex = path[1];
          const wordIndex = path[2];
          console.log(`Processing word deletion at page ${wordPageIndex}, line ${wordLineIndex}, word ${wordIndex}`);
          
          // Validate the path
          if (!docCopy.pages || wordPageIndex >= docCopy.pages.length) {
            console.error(`Page index out of bounds: ${wordPageIndex}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Page not found for word deletion');
          }
          
          if (!docCopy.pages[wordPageIndex].lines || wordLineIndex >= docCopy.pages[wordPageIndex].lines.length) {
            console.error(`Line index out of bounds: ${wordLineIndex}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Line not found for word deletion');
          }
          
          if (!docCopy.pages[wordPageIndex].lines[wordLineIndex].words || wordIndex >= docCopy.pages[wordPageIndex].lines[wordLineIndex].words.length) {
            console.error(`Word index out of bounds: ${wordIndex}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Word not found');
          }
          
          // Log the word structure before deletion
          console.log('Word before deletion:', {
            x: docCopy.pages[wordPageIndex].lines[wordLineIndex].words[wordIndex].x,
            width: docCopy.pages[wordPageIndex].lines[wordLineIndex].words[wordIndex].width,
            glyphsCount: docCopy.pages[wordPageIndex].lines[wordLineIndex].words[wordIndex].glyphs ? 
              docCopy.pages[wordPageIndex].lines[wordLineIndex].words[wordIndex].glyphs.length : 
              (docCopy.pages[wordPageIndex].lines[wordLineIndex].words[wordIndex].glyph ? 
                docCopy.pages[wordPageIndex].lines[wordLineIndex].words[wordIndex].glyph.length : 0)
          });
          
          // Store the deleted item
          deletedItem = docCopy.pages[wordPageIndex].lines[wordLineIndex].words[wordIndex];
          parentArray = docCopy.pages[wordPageIndex].lines[wordLineIndex].words;
          deleteIndex = wordIndex;
          
          // Remove the word
          docCopy.pages[wordPageIndex].lines[wordLineIndex].words.splice(wordIndex, 1);
          console.log(`Word at index ${wordIndex} removed from line ${wordLineIndex}, page ${wordPageIndex}`);
          break;
          
        case 'glyph':
          // Delete a glyph
          const glyphPageIndex = path[0];
          const glyphLineIndex = path[1];
          const glyphWordIndex = path[2];
          const glyphIndex = path[3];
          console.log(`Processing glyph deletion at page ${glyphPageIndex}, line ${glyphLineIndex}, word ${glyphWordIndex}, glyph ${glyphIndex}`);
          
          // Validate the path
          if (!docCopy.pages || glyphPageIndex >= docCopy.pages.length) {
            console.error(`Page index out of bounds: ${glyphPageIndex}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Page not found for glyph deletion');
          }
          
          if (!docCopy.pages[glyphPageIndex].lines || glyphLineIndex >= docCopy.pages[glyphPageIndex].lines.length) {
            console.error(`Line index out of bounds: ${glyphLineIndex}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Line not found for glyph deletion');
          }
          
          if (!docCopy.pages[glyphPageIndex].lines[glyphLineIndex].words || 
              glyphWordIndex >= docCopy.pages[glyphPageIndex].lines[glyphLineIndex].words.length) {
            console.error(`Word index out of bounds: ${glyphWordIndex}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Word not found for glyph deletion');
          }
          
          const wordForGlyph = docCopy.pages[glyphPageIndex].lines[glyphLineIndex].words[glyphWordIndex];
          
          // Handle both possible property names (glyphs or glyph)
          let glyphArray = null;
          let glyphPropertyName = '';
          
          if (wordForGlyph.glyphs && wordForGlyph.glyphs.length > 0) {
            glyphArray = wordForGlyph.glyphs;
            glyphPropertyName = 'glyphs';
            console.log(`Using 'glyphs' property with length ${glyphArray.length}`);
          } else if (wordForGlyph.glyph && wordForGlyph.glyph.length > 0) {
            glyphArray = wordForGlyph.glyph;
            glyphPropertyName = 'glyph';
            console.log(`Using 'glyph' property with length ${glyphArray.length}`);
          } else {
            console.error('No glyphs found in word');
            console.groupEnd();
            throw new Meteor.Error('not-found', 'No glyphs found in word');
          }
          
          if (glyphIndex >= glyphArray.length) {
            console.error(`Glyph index out of bounds: ${glyphIndex}, glyphs length: ${glyphArray.length}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Glyph not found');
          }
          
          // Log the glyph structure before deletion
          console.log('Glyph before deletion:', {
            x: glyphArray[glyphIndex].x,
            width: glyphArray[glyphIndex].width,
            elementsCount: glyphArray[glyphIndex].elements ? glyphArray[glyphIndex].elements.length : 0
          });
          
          // Store the deleted item
          deletedItem = glyphArray[glyphIndex];
          parentArray = glyphArray;
          deleteIndex = glyphIndex;
          
          // Remove the glyph
          glyphArray.splice(glyphIndex, 1);
          console.log(`Glyph at index ${glyphIndex} removed from word ${glyphWordIndex}, line ${glyphLineIndex}, page ${glyphPageIndex}`);
          break;
          
        case 'phoneme':
          // Delete a phoneme
          const phonemePageIndex = path[0];
          const phonemeLineIndex = path[1];
          const phonemeWordIndex = path[2];
          const phonemeIndex = path[3];
          console.log(`Processing phoneme deletion at page ${phonemePageIndex}, line ${phonemeLineIndex}, word ${phonemeWordIndex}, phoneme ${phonemeIndex}`);
          
          // Validate the path
          if (!docCopy.pages || phonemePageIndex >= docCopy.pages.length) {
            console.error(`Page index out of bounds: ${phonemePageIndex}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Page not found for phoneme deletion');
          }
          
          if (!docCopy.pages[phonemePageIndex].lines || 
              phonemeLineIndex >= docCopy.pages[phonemePageIndex].lines.length) {
            console.error(`Line index out of bounds: ${phonemeLineIndex}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Line not found for phoneme deletion');
          }
          
          if (!docCopy.pages[phonemePageIndex].lines[phonemeLineIndex].words || 
              phonemeWordIndex >= docCopy.pages[phonemePageIndex].lines[phonemeLineIndex].words.length) {
            console.error(`Word index out of bounds: ${phonemeWordIndex}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Word not found for phoneme deletion');
          }
          
          const wordForPhoneme = docCopy.pages[phonemePageIndex].lines[phonemeLineIndex].words[phonemeWordIndex];
          
          if (!wordForPhoneme.phonemes || phonemeIndex >= wordForPhoneme.phonemes.length) {
            console.error(`Phoneme index out of bounds: ${phonemeIndex}, phonemes length: ${wordForPhoneme.phonemes ? wordForPhoneme.phonemes.length : 0}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Phoneme not found');
          }
          
          // Log the phoneme structure before deletion
          console.log('Phoneme before deletion:', {
            x: wordForPhoneme.phonemes[phonemeIndex].x,
            width: wordForPhoneme.phonemes[phonemeIndex].width,
            ipa: wordForPhoneme.phonemes[phonemeIndex].ipa
          });
          
          // Store the deleted item
          deletedItem = wordForPhoneme.phonemes[phonemeIndex];
          parentArray = wordForPhoneme.phonemes;
          deleteIndex = phonemeIndex;
          
          // Remove the phoneme
          wordForPhoneme.phonemes.splice(phonemeIndex, 1);
          console.log(`Phoneme at index ${phonemeIndex} removed from word ${phonemeWordIndex}, line ${phonemeLineIndex}, page ${phonemePageIndex}`);
          break;
          
        case 'element':
          // Delete an element
          const elementPageIndex = path[0];
          const elementLineIndex = path[1];
          const elementWordIndex = path[2];
          const elementGlyphIndex = path[3];
          const elementIndex = path[4];
          
          console.log(`Processing element deletion at page ${elementPageIndex}, line ${elementLineIndex}, word ${elementWordIndex}, glyph ${elementGlyphIndex}, element ${elementIndex}`);
          console.log('Path length check:', path.length);
          
          // Validate the path - detailed logging at each step
          console.log('Validating page index...');
          if (!docCopy.pages) {
            console.error('No pages array found in document');
            console.groupEnd();
            throw new Meteor.Error('not-found', 'No pages found in document');
          }
          
          if (elementPageIndex >= docCopy.pages.length) {
            console.error(`Page index out of bounds: ${elementPageIndex}, pages length: ${docCopy.pages.length}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Page not found for element deletion');
          }
          
          console.log('Validating line index...');
          if (!docCopy.pages[elementPageIndex].lines) {
            console.error(`No lines array found in page ${elementPageIndex}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'No lines found in page');
          }
          
          if (elementLineIndex >= docCopy.pages[elementPageIndex].lines.length) {
            console.error(`Line index out of bounds: ${elementLineIndex}, lines length: ${docCopy.pages[elementPageIndex].lines.length}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Line not found for element deletion');
          }
          
          console.log('Validating word index...');
          if (!docCopy.pages[elementPageIndex].lines[elementLineIndex].words) {
            console.error(`No words array found in line ${elementLineIndex}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'No words found in line');
          }
          
          if (elementWordIndex >= docCopy.pages[elementPageIndex].lines[elementLineIndex].words.length) {
            console.error(`Word index out of bounds: ${elementWordIndex}, words length: ${docCopy.pages[elementPageIndex].lines[elementLineIndex].words.length}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Word not found for element deletion');
          }
          
          const elementWord = docCopy.pages[elementPageIndex].lines[elementLineIndex].words[elementWordIndex];
          
          // Handle both possible property names (glyphs or glyph)
          console.log('Locating glyph array property...');
          let glyph = null;
          let glyphsPropertyName = '';
          
          if (elementWord.glyphs && elementGlyphIndex < elementWord.glyphs.length) {
            glyph = elementWord.glyphs[elementGlyphIndex];
            glyphsPropertyName = 'glyphs';
            console.log(`Using 'glyphs' property, found glyph at index ${elementGlyphIndex}`);
          } else if (elementWord.glyph && elementGlyphIndex < elementWord.glyph.length) {
            glyph = elementWord.glyph[elementGlyphIndex];
            glyphsPropertyName = 'glyph';
            console.log(`Using 'glyph' property, found glyph at index ${elementGlyphIndex}`);
          } else {
            console.error(`Glyph index out of bounds or no glyphs found: ${elementGlyphIndex}`);
            if (elementWord.glyphs) console.log(`glyphs length: ${elementWord.glyphs.length}`);
            if (elementWord.glyph) console.log(`glyph length: ${elementWord.glyph.length}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Glyph not found');
          }
          
          console.log('Validating element index...');
          if (!glyph.elements) {
            console.error(`No elements array found in ${glyphsPropertyName}[${elementGlyphIndex}]`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'No elements found in glyph');
          }
          
          if (elementIndex >= glyph.elements.length) {
            console.error(`Element index out of bounds: ${elementIndex}, elements length: ${glyph.elements.length}`);
            console.groupEnd();
            throw new Meteor.Error('not-found', 'Element not found');
          }
          
          // Log the element structure before deletion
          console.log('Element before deletion:', {
            x: glyph.elements[elementIndex].x,
            y: glyph.elements[elementIndex].y,
            width: glyph.elements[elementIndex].width,
            height: glyph.elements[elementIndex].height
          });
          
          // Store the deleted item
          deletedItem = glyph.elements[elementIndex];
          parentArray = glyph.elements;
          deleteIndex = elementIndex;
          
          // Remove the element
          glyph.elements.splice(elementIndex, 1);
          console.log(`Element at index ${elementIndex} removed from glyph ${elementGlyphIndex}, word ${elementWordIndex}, line ${elementLineIndex}, page ${elementPageIndex}`);
          break;
          
        default:
          console.error(`Unknown item type: ${itemType}`);
          console.groupEnd();
          throw new Meteor.Error('invalid-type', `Unknown item type: ${itemType}`);
      }
      
      // Log the parent array after deletion
      if (parentArray && deleteIndex !== -1) {
        console.log(`Parent array length before: ${parentArray.length + 1}, after: ${parentArray.length}`);
        console.log(`Element at index ${deleteIndex} has been removed`);
      }
      
      // Update the document
      console.log('Updating document in database...');
      const updateResult = Documents.update({ _id: documentId }, { $set: docCopy });
      console.log(`Update result: ${updateResult} documents affected`);
      
      // Log success
      console.log(`Successfully deleted ${itemType} at path [${path.join(',')}]`);
      console.timeEnd('deleteDocumentItem');
      console.groupEnd();
      
      return {
        success: true,
        message: `${itemType} deleted successfully`,
        path: path,
        deletedItem: deletedItem
      };
    } catch (error) {
      console.error('Error in deleteDocumentItem:', error);
      console.timeEnd('deleteDocumentItem');
      console.groupEnd();
      throw error;
    }
  },

  // Add new method for inserting pages at specific index
  insertPageAtIndex: function(documentId, fileObjId, insertAfterIndex, title) {
    // Ensure the user is logged in
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in to insert a page');
    }
    
    console.log(`Server: inserting page after index ${insertAfterIndex} in document ${documentId}`);
    
    // Convert insertAfterIndex to a number to ensure proper comparison
    insertAfterIndex = Number(insertAfterIndex);
    
    // Get the current document
    const doc = Documents.findOne({_id: documentId});
    if (!doc) {
      throw new Meteor.Error('not-found', 'Document not found');
    }
    
    // Create the new page object
    const newPage = {
      pageId: fileObjId,
      title: title || `Page ${insertAfterIndex + 2}`, // Default title if none provided
      addedBy: this.userId,
      lines: []
    };
    
    // Create a copy of the pages array
    let pages = [...doc.pages];
    
    // Use splice to insert the new page at the correct position (after the specified index)
    // Add 1 to insertAfterIndex because splice inserts before the index
    pages.splice(insertAfterIndex + 1, 0, newPage);
    
    // Update the document with the modified pages array
    Documents.update({_id: documentId}, {$set: {pages: pages}});
    
    return {success: true, message: 'Page inserted successfully'};
  }
});
