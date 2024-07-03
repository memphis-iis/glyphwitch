import { Meteor } from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';
import { Accounts } from 'meteor/accounts-base';
import { fromBuffer } from 'pdf2pic';
import util from 'util';
import ssim from 'ssim.js';
import pdf2img from 'pdf-img-convert';
import request from 'request';
import promisify from 'util.promisify';
import jimp from 'jimp';




const fs = require('fs');
const path = require('path');




// Meteor collections for MongoDB database. 

// Define the collections for the MongoDB database. 

//set storagepath to the ../../assets folder
const storagePath = path.join(process.cwd(), '../assets');


Documents = new Meteor.Collection("documents");
References = new Meteor.Collection("references");
Phonemes = new Meteor.Collection("phonemes");
Fonts = new Meteor.Collection("fonts");
Glyphs = new Meteor.Collection("glyphs");
Discussion = new Meteor.Collection("discussion");
Files = new FilesCollection({
    collectionName: 'files',
    storagePath: storagePath,
    allowClientCode: false, // Disallow remove files from Client
    onBeforeUpload(file) {
        // Allow upload files under 10MB, and only in image, pdf, text, and font formats
        if (file.size <= 10485760 && /pdf|jpg|png|jpeg|txt|otf|ttf|woff|woff2/i.test(file.extension)) {
            return true;
        } else {
            return 'Please upload image, pdf, text, or font file, with size equal or less than 10MB';
        }
    }
});


// Define methods for the collections. They must be exported to be used in the main server file.

Meteor.methods({
    //create a new user, set role to user. Must have a username, email, and password. 
    createNewUser: function(username, email, password) {
        console.log("Creating user (username: " + username + ", email: " + email + ", password: " + password + ")");
        //check if the user already exists, if so return an error
        errors = [];
        if (Meteor.users.findOne({username: username})) {
            console.log("Error: User already exists");
            errors.push("User already exists, please choose a different username or login.");
        }
        //if the email is not valid, return an error
        if (!email.includes('@') || !email.includes('.')) {
            console.log("Error: Email is not valid");
            errors.push("Email is not valid, please enter a valid email address.");
        }
        //if the password is not at least 6 characters, contailn at least one number, and at least one uppercase letter, and a special character, return an error
        if (!password.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/)) {
            console.log("Error: Password is not valid");
            errors.push("Password must be at least 6 characters long and contain at least one number, one uppercase letter, and one special character.");
        }
        //if there are errors, return the errors
        if (errors.length > 0) {
            return errors;
        }
        Accounts.createUser({
            username: username,
            email: email,
            password: password
        });
        Roles.addUsersToRoles(Meteor.users.findOne({ username: username }), 'user');
    },
    //set user role
    setUserRole: function(username, role) {
        console.log("Setting user role (username: " + username + ", role: " + role + ")");
        //get the user
        user = Meteor.users.findOne({ username: username });
        //set the role
        try {
            Roles.addUsersToRoles(user, role);
            return true;
        } catch (error) {
            console.log("Error: " + error);
            return error;
        }
    },
    //change username and password, or just the password. Must include the old username. The old username is optional. New password must be at least 6 characters, contain at least one number, one uppercase letter, and one special character.
    changeEmailPassword: function(oldEmail, newPassword, newEmail=False) {
    console.log("Changing email and password (oldEmail: " + oldEmail + ", newPassword: " + newPassword + ", newEmail: " + newEmail + ")");
    //get the current user
    user = Meteor.user();
    console.log(user);
    //if the new email is provided, change the email
    if (newEmail) {
        try {
            Accounts.addEmail(user._id, newEmail);
            Accounts.removeEmail(user._id, oldEmail);
        } catch (error) {
            console.log("Error: " + error);
            return error;
        }
    }
    //change the password
    try {
        Accounts.setPassword(user._id, newPassword);
        return true;
    } catch (error) {
        console.log("Error: " + error);
        return error;
    }
    },
    //delete user
    deleteUser: function(username) {
        console.log("Deleting user (username: " + username + ")");
        //get the user
        user = Meteor.users.findOne({ username: username });
        //delete the user
        try {
            Meteor.users.remove(user);
            return true;
        } catch (error) {
            console.log("Error: " + error);
            return error;
        }
    },
    //add an entry to the documents collection. Must include the file collection location, the title, and the author. and the user who added it.
    addDocument: function(file, title, author) {
        console.log("Adding document (file: " + file + ", title: " + title + ", author: " + author + ")");
        //get the file from image collection
        file = Files.findOne({ _id: file });
        filepath = file.path;
        pages = [] // Replace pdfToImages(file) with an empty array
        document = Documents.insert({
            file: file._id,
            title: title,
            author: author,
            pages: [],
            addedBy: ""
        });
        console.log("Document added: " + document + ". Populating pages.")
        convertPdfToImages(file, document);
    
    },
    //remove an entry from the documents collection. Must include the document id.
    removeDocument: function(document) {
        console.log("Removing document (document: " + document + ")");
        Documents.remove(document);
    },
    //update an entry in the documents collection. Must include the document id, the file collection location, the title, and the author.
    updateDocument: function(document, file, title, author) {
        console.log("Updating document (document: " + document + ", file: " + file + ", title: " + title + ", author: " + author + ")");
        Documents.update(document, { $set: { file: file, title: title, author: author } });
    },
    //add page to a document. Must include the document id, the page number, and the user who added it.
    addPageToDocument: function(document, page) {
        console.log("Adding page (document: " + document + ", page: " + page + ")");
        Documents.update(document, { $push: { pages: page, lines: [], addedBy: Meteor.userId() } });
    },
    //remove page from a document. Must include the document id, the page number, and the user who added it.
    removePageFromDocument: function(document, page) {
        console.log("Removing page (document: " + document + ", page: " + page + ")");
        Documents.update(document, { $pull: { pages: page, addedBy: Meteor.userId() } });
    },
    //modify page in a document. Must include the document id, the page number, and the user who added it.
    modifyPageInDocument: function(document, page) {
        console.log("Modifying page (document: " + document + ", page: " + page + ")");
        Documents.update(document, { $set: { pages: page, addedBy: Meteor.userId() } });
    },
    //add line to a page. Must include the document id, the page number, x1, y1, width, height, and the user who added it.
    addLineToPage: function(document, page_number, x1, y1, width, height) {
        console.log("Adding line (document: " + document + ", page: " + page_number + ", x1: " + x1 + ", y1: " + y1 + ", width: " + width + ", height: " + height + ")");
        //get the Document
        var doc = Documents.findOne(document);
        //push the line to the page
        doc.pages[page_number].lines.push({ x1: x1, y1: y1, width: width, height: height , words: []});
        //update the document
        Documents.update(document, doc);
    },
    //remove line from a page. Must include the document id, the page number, the line number, and the user who added it.
    removeLineFromPage: function(document, page, line) {
        console.log("Removing line (document: " + document + ", page: " + page + ", line: " + line + ")");
        //get the Document
        var doc = Documents.findOne(document);
        //remove the line from the page
        doc.pages[page].lines.splice(line, 1);
        //update the document
        Documents.update(document, doc);
    },
    //add word to a line. Must include the document id, the page number, the line number, the x coordinate, the width, the word order number, the word, and the user who added it.
    addWordToLine: function(document, page, line, x, width, wordOrder=false, word=false) {
        console.log("Adding word (document: " + document + ", page: " + page + ", line: " + line + ", x: " + x + ", width: " + width + ", wordOrder: " + wordOrder + ", word: " + word + ")");
        //get the Document
        var doc = Documents.findOne(document);
        //push the word to the line
        doc.pages[page].lines[line].words.push({ x: x, width: width, wordOrder: wordOrder, word: word});
        //update the document
        Documents.update(document, doc);
    },
    //remove word from a line. Must include the document id, the page number, the line number, the word order number, and the user who added it.
    removeWordFromLine: function(document, page, line, wordOrder) {
        console.log("Removing word (document: " + document + ", page: " + page + ", line: " + line + ", wordOrder: " + wordOrder + ")");
        //get the Document
        var doc = Documents.findOne(document);
        //remove the word from the line
        doc.pages[page].lines[line].words.splice(wordOrder, 1);
        //update the document
        Documents.update(document, doc);
    },
    //modify word in a line. Must include the document id, the page number, the line number, the word order number, the word, and the user who added it.
    modifyWordInLine: function(document, page, line, wordOrder, word) {
        console.log("Modifying word (document: " + document + ", page: " + page + ", line: " + line + ", wordOrder: " + wordOrder + ", word: " + word + ")");
        //get the Document
        var doc = Documents.findOne(document);
        //modify the word in the line
        doc.pages[page].lines[line].words[wordOrder].word = word;
        //update the document
        Documents.update(document, doc);
    },
    //add an entry to the references collection. Must include the user who added it, the document id, the page number, and the line number, the word order number, and the word, an empty phoneme array, and notes.
    addReference: function(document, page, line, wordOrder, word, notes) {
        console.log("Adding reference (document: " + document + ", page: " + page + ", line: " + line + ", wordOrder: " + wordOrder + ", word: " + word + ", notes: " + notes + ")");
        References.insert({
            document: document,
            page: page,
            line: line,
            wordOrder: wordOrder,
            word: word,
            phonemes: [],
            notes: notes,
            discussion: [],
            addedBy: Meteor.userId()
        });
    },
    //remove an entry from the references collection. Must include the reference id.
    removeReference: function(reference) {
        console.log("Removing reference (reference: " + reference + ")");
        References.remove(reference);
    },
    //update an entry in the references collection. Must include the reference id, the document id, the page number, the line number, the word order number, the word, and the notes.
    updateReference: function(reference, document, page, line, wordOrder, word, notes) {
        console.log("Updating reference (reference: " + reference + ", document: " + document + ", page: " + page + ", line: " + line + ", wordOrder: " + wordOrder + ", word: " + word + ", notes: " + notes + ")");
        References.update(reference, { $set: { document: document, page: page, line: line, wordOrder: wordOrder, word: word, notes: notes } });
    },
    //add a phoneme to a reference, must include the reference id, the phoneme id, and the user who added it.
    addPhonemeToReference: function(reference, phoneme) {
        console.log("Adding phoneme (reference: " + reference + ", phoneme: " + phoneme + ")");
        References.update(reference, { $push: { phonemes: phoneme, addedBy: Meteor.userId() } });
    },
    //remove a phoneme from a reference, must include the reference id, the phoneme id, and the user who added it.
    removePhonemeFromReference: function(reference, phoneme) {
        console.log("Removing phoneme (reference: " + reference + ", phoneme: " + phoneme + ")");
        References.update(reference, { $pull: { phonemes: phoneme, addedBy: Meteor.userId() } });
    },
    //add an entry to the phonemes collection. Must include the phoneme, the user who added it, an empty glyph array, an ipa pronunciation
    addPhoneme: function(phoneme, ipa) {
        console.log("Adding phoneme (phoneme: " + phoneme + ", ipa: " + ipa + ")");
        Phonemes.insert({
            phoneme: phoneme,
            glyphs: [],
            ipa: ipa,
            addedBy: Meteor.userId()
        });
    },
    //remove an entry from the phonemes collection. Must include the phoneme id.
    removePhoneme: function(phoneme) {
        console.log("Removing phoneme (phoneme: " + phoneme + ")");
        Phonemes.remove(phoneme);
    },
    //update an entry in the phonemes collection. Must include the phoneme id, the phoneme, the ipa pronunciation, and the user who added it.
    updatePhoneme: function(phoneme, phoneme, ipa) {
        console.log("Updating phoneme (phoneme: " + phoneme + ", ipa: " + ipa + ")");
        Phonemes.update(phoneme, { $set: { phoneme: phoneme, ipa: ipa } });
    },
    //add a glyph to a phoneme. Must include the phoneme id, the glyph id, and the user who added it.
    addGlyphToPhoneme: function(phoneme, glyph) {
        console.log("Adding glyph (phoneme: " + phoneme + ", glyph: " + glyph + ")");
        Phonemes.update(phoneme, { $push: { glyphs: glyph, addedBy: Meteor.userId() } });
    },
    //remove a glyph from a phoneme. Must include the phoneme id, the glyph id, and the user who added it.
    removeGlyphFromPhoneme: function(phoneme, glyph) {
        console.log("Removing glyph (phoneme: " + phoneme + ", glyph: " + glyph + ")");
        Phonemes.update(phoneme, { $pull: { glyphs: glyph, addedBy: Meteor.userId() } });
    },
    //add an entry to the glyphs collection. Must include the glyph, the user who added it, it may contain a font id, a unicode value for that font, an image, and the user who added it.
    addGlyph: function(glyph, font=False, unicode=False, image=False) {
        console.log("Adding glyph (glyph: " + glyph + ", font: " + font + ", unicode: " + unicode + ", image: " + image + ")");
        //if font or unicode or image is not provided, return an error
        if ((!font && !unicode) || !image) {
            console.log("Error: Glyph must have a font and unicode or an image");
            return;
        }
        Glyphs.insert({
            glyph: glyph,
            font: font,
            unicode: unicode,
            image: image,
            addedBy: Meteor.userId()
        });
    },
    //add glyph using canvas data
    addGlyphFromDataURL: function(dataURL, font="", unicode=0) {
        console.log("Adding glyph from dataURL (dataURL: " + dataURL + ")");
        bufferedImage = new Buffer(dataURL.replace(/^data:image\/\w+;base64,/, ""), 'base64');

        Files.write(bufferedImage, { fileName: 'glyph.png', type: 'image/png' }, function (err, fileObj) {
            if (err) {
                console.log("Error: " + err);
            } else {
                console.log("File added: " + fileObj._id);
                link = Files.findOne(fileObj._id).link();
                Glyphs.insert({
                    glyph: "glyph",
                    font: "",
                    unicode: "",
                    image: fileObj._id,
                    image_link: link,

                });
            }
        });
    },
    //add glyph from buffer
    addGlyphFromBuffer: function(buffer, font, unicode) {
        console.log("Adding glyph from buffer (buffer: " + buffer + ", font: " + font + ", unicode: " + unicode + ")");
        Files.write(buffer, { fileName: 'glyph.png', type: 'image/png' }, function (err, fileObj) {
            if (err) {
                console.log("Error: " + err);
            } else {
                console.log("File added: " + fileObj._id);
                link = Files.findOne(fileObj._id).link();
                Glyphs.insert({
                    glyph: "glyph",
                    font: font,
                    unicode: unicode,
                    image: fileObj._id,
                    image_link: link,
                });
            }
        });
    },

    compareImageGlyphs: function(glyph1, glyph2) {
        console.log("Comparing image glyphs (glyph1: " + glyph1 + ", glyph2: " + glyph2 + ")");
       
    },
    findNearbyGlyphsFromDataURL: async function(dataURL, numGlyphs) {
        console.log("Finding nearby glyphs from dataURL...");
      
        // Decode dataURL efficiently
        bufferedImage = new Buffer.from(dataURL.replace(/^data:image\/\w+;base64,/, ""), 'base64');
      
        //convert the buffer to Uint8ClampedArray
        const searchImage = {
            data: new Uint8ClampedArray(bufferedImage),
            width: 20,
            height: 20
        }

        const distances = [];
        const glyphs = Glyphs.find().fetch();
      
        //preprocess the image by blurring it
        for (const glyph of glyphs) {
            console.log("Comparing glyph: " + glyph._id);

            //get the glyph image link
            const glyphImage = Files.findOne(glyph.image).link();

            //download the image
            const getGlyphImage = promisify(request.get);
            const glyphBuffer = await getGlyphImage(glyphImage, { encoding: null });

            //find the bounding box of each image
            let minXimage1 = 20 - 1;
            let minYimage1 = 20 - 1;
            let maxXimage1 = 0;
            let maxYimage1 = 0;
            let minXimage2 = 20 - 1;
            let minYimage2 = 20 - 1;
            let maxXimage2 = 0;
            let maxYimage2 = 0;

            for (let i = 0; i < searchImage.data.length; i += 4) {
                const x = (i / 4) % 20;
                const y = Math.floor((i / 4) / 20);
                if (searchImage.data[i] < 255) {
                    minXimage1 = Math.min(minXimage1, x);
                    minYimage1 = Math.min(minYimage1, y);
                    maxXimage1 = Math.max(maxXimage1, x);
                    maxYimage1 = Math.max(maxYimage1, y);
                }
                if (glyphBuffer.body[i] < 255) {
                    minXimage2 = Math.min(minXimage2, x);
                    minYimage2 = Math.min(minYimage2, y);
                    maxXimage2 = Math.max(maxXimage2, x);
                    maxYimage2 = Math.max(maxYimage2, y);
                }
            }

            //calculate the padding
            const targetWidth = 20;
            const targetHeight = 20;

            const paddingX1 = Math.floor((targetWidth - (maxXimage1 - minXimage1 + 1)) / 2);
            const paddingY1 = Math.floor((targetHeight - (maxYimage1 - minYimage1 + 1)) / 2);
            const paddingX2 = Math.floor((targetWidth - (maxXimage2 - minXimage2 + 1)) / 2);
            const paddingY2 = Math.floor((targetHeight - (maxYimage2 - minYimage2 + 1)) / 2);

            //create centered images
            const centeredImage1 = new Uint8ClampedArray(targetWidth * targetHeight * 4).fill(255);

            for (let i = 0; i < searchImage.data.length; i += 4) {
                const x = (i / 4) % 20;
                const y = Math.floor((i / 4) / 20);
                const index = ((y + paddingY1) * targetWidth + (x + paddingX1)) * 4;
                centeredImage1[index] = searchImage.data[i];
                centeredImage1[index + 1] = searchImage.data[i + 1];
                centeredImage1[index + 2] = searchImage.data[i + 2];
                centeredImage1[index + 3] = searchImage.data[i + 3];
            }

            const centeredImage2 = new Uint8ClampedArray(targetWidth * targetHeight * 4).fill(255);

            for (let i = 0; i < glyphBuffer.body.length; i += 4) {
                const x = (i / 4) % 20;
                const y = Math.floor((i / 4) / 20);
                const index = ((y + paddingY2) * targetWidth + (x + paddingX2)) * 4;
                centeredImage2[index] = glyphBuffer.body[i];
                centeredImage2[index + 1] = glyphBuffer.body[i + 1];
                centeredImage2[index + 2] = glyphBuffer.body[i + 2];
                centeredImage2[index + 3] = glyphBuffer.body[i + 3];
            }

            const similarity = findMatches(centeredImage1, centeredImage2);

            distances.push({ glyph: glyph, distance: similarity });



        }   
        //sort distances high to low
        distances.sort((a, b) => (a.distance < b.distance) ? 1 : -1);
        //return the closest numGlyphs
        console.log("Distances: " + JSON.stringify(distances));
        return distances;
      
  
      },
    findNearbyGlyphs: function(glyph_id, numGlyphs) {
        console.log("Finding nearby glyphs (image: " + image + ", numGlyphs: " + numGlyphs + ")");
        
    },

    //remove an entry from the glyphs collection. Must include the glyph id.
    removeGlyph: function(glyph) {
        console.log("Removing glyph (glyph: " + glyph + ")");
        Glyphs.remove({ _id: glyph })
    },
    //update an entry in the glyphs collection. Must include the glyph id, the glyph, the font, the unicode, and the image.
    updateGlyph: function(glyph, glyph, font, unicode, image) {
        console.log("Updating glyph (glyph: " + glyph + ", font: " + font + ", unicode: " + unicode + ", image: " + image + ")");
        Glyphs.update(glyph, { $set: { glyph: glyph, font: font, unicode: unicode, image: image } });
    },
    //add an entry to the fonts collection. Must include the font, the user who added it, and it's file collection id
    addFont: function(file) {
        file = Files.findOne({ _id: file });
        //iterate over all the glyphs in the font and generate images for them
        const font = file.path;
        const glyphs = [];
        //we have to iterate over all the possible unicode values for a font
        for (let i = 0; i < 100; i++) {
            console.log("Adding glyph: " + i + " to font: " + file._id);
            const fileName = "glyph_" + file._id + "_" + i + ".png";
            createGlyphImage(font, i)
        }
    },
    //remove an entry from the fonts collection. Must include the font id.
    removeFont: function(font) {
        console.log("Removing font (font: " + font + ")");
        Fonts.remove(font);
    },
    //remove a file from the files collection. Must include the file id.
    removeFile: function(file) {
        console.log("Removing file (file: " + file + ")");
        Files.remove(file);
    },
    //get reference by document, page, line, and word order. Everything but the document is optional.
    findReferences: function(document, page=False, line=False, wordOrder=False) {
        console.log("Finding references (document: " + document + ", page: " + page + ", line: " + line + ", wordOrder: " + wordOrder + ")");
        //if only the document is provided, return all references for that document
        if (page == False && line == False && wordOrder == False) {
            return References.find({ document: document });
        }
        //if the document and page are provided, return all references for that page
        else if (line == False && wordOrder == False) {
            return References.find({ document: document, page: page });
        }
        //if the document, page, and line are provided, return all references for that line
        else if (wordOrder == False) {
            return References.find({ document: document, page: page, line: line });
        }
        //if the document, page, line, and word order are provided, return all references for that word
        else {
            return References.find({ document: document, page: page, line: line, wordOrder: wordOrder });
        }
    },
    //create a new discussion on a reference. Must include the reference id, the user who added it, and the text of the first comment.
    addDiscussion: function(reference, comment) {
        console.log("Adding discussion (reference: " + reference + ", comment: " + comment + ")");
        Discussion.insert({
            reference: reference,
            comments: [{ text: comment, addedBy: Meteor.userId() }]
        });
    },
    getDiscussion: function(reference) {
        console.log("Getting discussion (reference: " + reference + ")");
        return Discussion.findOne({reference: reference});
    }
});

//Define Publications for the collections. They must be exported to be used in the main server file. 
//All collections are published to the client.
Meteor.publish("all", function() {
    return [
        Documents.find(),
        References.find(),
        Phonemes.find(),
        Fonts.find(),
        Glyphs.find(),
        Discussion.find()
    ];
});
//User data is also published to the client.
Meteor.publish("userData", function () {
    return Meteor.users.find();
});

//image publication
Meteor.publish('files.images.all', function () {
    return Files.find().cursor;
  });


//Utility Functions

//Function to open a local pdf file and convert it to images, then add the images to the image collection. Returns the images as an array of image ids.
async function convertPdfToImages(pdfinfo, documentId) {
    console.log("PDF Path: " + pdfinfo.fetch()[0].path, "Document ID: " + documentId);
    //read the pdf file
    const pdfPath = pdfinfo.fetch()[0].path;
    const pdfPageCounter = require('pdf-page-counter');
    //get the number of pages in the pdf
    outputImages = pdf2img.convert(pdfPath, function(err, info) {
        if (err) {
            console.log("Error: " + err);
        } else {
            console.log("Info: " + info);
        }
    });
    outputImages.then(function(images) {
        console.log("Images: " + images);
        //add the images to the image collection
        for (image of images) {
            Files.write(image, { fileName: 'page' + images.indexOf(image) + '.png', type: 'image/png' }, function (err, fileObj) {
                if (err) {
                    console.log("Error: " + err);
                } else {
                    console.log("File added: " + fileObj._id);
                    link = Files.findOne(fileObj._id).link();
                    Documents.update(documentId, { $push: { pages: {pageId: fileObj._id, image: link, lines: []} } });
                }
            });
        }
    });
}


//specialty functions for the glyphwitch application
function blurImage(imageData, kernelSize) {
    const width = imageData.width;
    const height = imageData.height;
    const newImageData = new Uint8ClampedArray(width * height);
  
    // Iterate through each pixel (excluding edges for proper blurring)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        let count = 0;
  
        // Apply kernel around the center pixel
        for (let ky = -kernelSize; ky <= kernelSize; ky++) {
          for (let kx = -kernelSize; kx <= kernelSize; kx++) {
            const neighborX = x + kx;
            const neighborY = y + ky;
  
            // Check if neighbor pixel is within image bounds
            if (neighborX >= 0 && neighborX < width && neighborY >= 0 && neighborY < height) {
              const neighborIndex = neighborY * width + neighborX;
              sum += imageData[neighborIndex];
              count++;
            }
          }
        }
  
        // Set new pixel value as the average of neighbors
        const newIndex = y * width + x;
        newImageData[newIndex] = Math.floor(sum / count);
      }
    }
  
    // Copy edge pixels directly (no blurring for these)
    for (let y = 0; y < height; y++) {
      newImageData[y * width] = imageData[y * width]; // Top row
      newImageData[(y + 1) * width - 1] = imageData[(y + 1) * width - 1]; // Bottom row
    }
    for (let x = 0; x < width; x++) {
      newImageData[x] = imageData[x]; // Left column
      newImageData[height * width - x - 1] = imageData[height * width - x - 1]; // Right column
    }
  
    return newImageData;
  }

  function findMatches(searchImage, glyphImage) {
    //generate matrices for the images
    const searchMatrix = new cv.Mat(searchImage, 20, 20, cv.CV_8UC4);
    const glyphMatrix = new cv.Mat(glyphImage, 20, 20, cv.CV_8UC4);
    const dest = new cv.Mat();
    const mask = new cv.Mat();
    //create a match template
    cv.matchTemplate(searchMatrix, glyphMatrix, dest, cv.TM_CCOEFF_NORMED, mask);
    const res = cv.minMaxLoc(dest, mask);
    const match = {
        x: res.minMaxLoc().maxLoc.x,
        y: res.minMaxLoc().maxLoc.y,
        width: glyphMatrix.cols,
        height: glyphMatrix.rows
    };
    match.center = {
        x: match.x + match.width / 2,
        y: match.y + match.height / 2
    };
    //copy the search image
    const searchImageCopy = searchMatrix.clone();
    //draw the match rectangle
    const color = new cv.Scalar(255, 0, 0, 255);
    cv.rectangle(searchImageCopy, new cv.Point(match.x, match.y), new cv.Point(match.x + match.width, match.y + match.height), color, 2, cv.LINE_8, 0);
    //convert the image to a dataURL
    const dataURL = cv.imencode('.png', searchImageCopy).toString('base64');
    console.log("Match: " + JSON.stringify(match));
    //get the confidence of the match
    const confidence = res.maxVal;

  }

  function createGlyphImage(fontPath, charCode) {
    const fontFileName = fontPath.split('/').pop();
    const opentype  = require('opentype.js');
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(20, 20);
    const ctx = canvas.getContext('2d');
    const buffers = {};
    const font = opentype.loadSync(fontPath, (err, font) => {
        if (err) {
            console.log("Error: " + err);
            return;
        }
    });
    //print the character
    console.log("Glyph: " + String.fromCharCode(charCode));
    if (font.charToGlyph(String.fromCharCode(charCode)) == "") {
        console.log("Error: Glyph not found in font");
        return;
    }
    font.draw(ctx, String.fromCharCode(charCode), 3, 18, 20);
    //if the image is pure white, return
    if (ctx.getImageData(0, 0, 20, 20).data.every((val, i, arr) => val === arr[0])) {
        console.log("Error: Glyph is blank");
        return;
    }
    newBuffer = canvas.toDataURL();
    //add the image to the image collection
    Meteor.call('addGlyphFromDataURL', newBuffer, fontFileName, charCode);
  }