import { Meteor } from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';
import { Accounts } from 'meteor/accounts-base';
import { fromBuffer } from 'pdf2pic';
import opencv from 'opencv4nodejs';


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
        console.log("Adding line (document: " + document + ", page: " + page + ", x1: " + x1 + ", y1: " + y1 + ", width: " + width + ", height: " + height + ")");
        //get the Document
        var doc = Documents.findOne(document);
        //push the line to the page
        doc.pages[page_number].lines.push({ x1: x1, y1: y1, width: width, height: height });
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
    addWordToLine: function(document, page, line, x, width, wordOrder, word) {
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
    addGlyphFromDataURL: function(dataURL) {
        console.log("Adding glyph from dataURL (dataURL: " + dataURL + ")");
        bufferedImage = new Buffer(dataURL.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        //use openCV to read the image and get HOG features
        //read the image using opencv
        img = opencv.imdecode(bufferedImage);
        //get the HOG features of the image
        hog = new opencv.HOGDescriptor();
        features = hog.compute(img);
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
                    addedBy: "",
                    features: features
                });
            }
        });
    },
    compareImageGlyphs: function(glyph1, glyph2) {
        console.log("Comparing image glyphs (glyph1: " + glyph1 + ", glyph2: " + glyph2 + ")");
        //read the glyphs
        glyph1 = Glyphs.findOne({ _id: glyph1 });
        glyph2 = Glyphs.findOne({ _id: glyph2 });
        //check if HOG features are already calculated
        if (glyph1.features) {
            targetFeatures = glyph1.features;
        } else {
            //get the image data
            image1 = Files.findOne({ _id: glyph1.image });
            //get the image using http
            image1Data = HTTP.get(image1.link(), {responseType: 'arraybuffer'});
            //convert the image data to a buffer
            image1Buffer = new Buffer(image1Data.content, 'binary');
            //read the image using opencv
            img1 = opencv.imdecode(image1Buffer);
            //compare the images using HOG features
            hog = new opencv.HOGDescriptor();
            targetFeatures = hog.compute(img1);
            glyph1.features = targetFeatures;
            //add the hog features to the image in the database
            Glyphs.update(glyph1, { $set: { features: targetFeatures } });
        }
        if (glyph2.features) {
            queryFeatures = glyph2.features;
        } else {
            //get the image data
            image2 = Files.findOne({ _id: glyph2.image });
            //get the image using http
            image2Data = HTTP.get(image2.link(), {responseType: 'arraybuffer'});
            //convert the image data to a buffer
            image2Buffer = new Buffer(image2Data.content, 'binary');
            //read the image using opencv
            img2 = opencv.imdecode(image2Buffer);
            //compare the images using HOG features
            hog = new opencv.HOGDescriptor();
            queryFeatures = hog.compute(img2);
            glyph2.features = queryFeatures;
            //add the hog features to the image in the database
            Glyphs.update(glyph2, { $set: { features: queryFeatures } });
        }
        //compare the images using HOG features
        similarity = opencv.matchShapes(targetFeatures, queryFeatures, 1, 0);
         
        return similarity;
    },
    findNearbyGlyphs: function(glyph_id, numGlyphs) {
        console.log("Finding nearby glyphs (image: " + image + ", numGlyphs: " + numGlyphs + ")");
        //read the glyphs
        glyph = Glyphs.findOne({ _id: glyph_id });
        //get the features of the image
        features = image.features;
        //find the nearest glyphs
        distances = [];
        Glyphs.find().forEach(function(glyph) {
            if (glyph.features) {
                similarity = opencv.matchShapes(features, glyph.features, 1, 0);
                distances.push({ glyph: glyph._id, similarity: similarity });
            }
        });
        //sort the distances
        distances.sort(function(a, b) {
            return a.similarity - b.similarity;
        });
        //return the top numGlyphs
        return distances.slice(0, numGlyphs);
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
    addFont: function(font, file) {
        console.log("Adding font (font: " + font + ", file: " + file + ")");
        Fonts.insert({
            font: font,
            file: file,
            addedBy: Meteor.userId()
        });
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
    dataBuffer = fs.readFileSync(pdfPath);
    //get the number of pages in the pdf
    const imageIds = [];
    pdfPageCounter(dataBuffer).then(function (data) {
        for (let i = 1; i <= data.numpages; i++) {
            console.log("Converting page " + i + " to image");
            fromBuffer(dataBuffer).bulk(i, { responseType: 'buffer' }).then((images) => {
                //create a buffer from the image
                const buffer = Buffer.from(images);
                //upload the image to the image collection as buffer
                Files.write(buffer, { fileName: 'page' + i + '.png', type: 'image/png' }, function (err, fileObj) {
                    if (err) {
                        console.log("Error: " + err);
                    } else {
                        console.log("File added: " + fileObj._id);
                        //add the image to the images array
                        imageIds.push({ pageId: fileObj._id , page: i , lines: []});
                        Documents.update({ _id: documentId }, { $set: { pages: imageIds } });
                    }
                });
            });
        }
    });


}
