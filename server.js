import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import axios from 'axios';

const app = express();
const port = 3000;

// DATABASE CONNECTION DETAILS
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "books",
  password: "123456",
  port: 5432,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// ROUTE TO FETCH AND DISPLAY BOOKS
app.get('/', async (req, res) => {
  try {
    // FETCH BOOKS FROM THE DATABASE
    const result = await db.query("SELECT * FROM books");
    const books = result.rows;

    // FETCH COVERS FOR EACH BOOK USING THE OPEN LIBRARY'S API
    const booksWithImages = await Promise.all(books.map(async (book) => {
      try {
        // Log the ISBN and title for troubleshooting
        console.log(`ISBN for the book '${book.title}': ${book.isbn}`);

        // Make the request to Open Library API
        const apiResponse = await axios.get(`https://openlibrary.org/isbn/${book.isbn}.json`);
        
        // Handle cases where the API response does not include cover images
        const coverImageId = apiResponse.data.covers ? apiResponse.data.covers[0] : null;
        const coverImageUrl = coverImageId ? `https://covers.openlibrary.org/b/id/${coverImageId}-L.jpg` : null;

        return {
          ...book,
          cover_image_url: coverImageUrl,
        };
      } catch (apiError) {
        // Log the error and the title for troubleshooting
        console.error(`Error fetching cover for the book '${book.title}': ${apiError.message}`);
        
        // Return a placeholder for books with missing covers
        return {
          ...book,
          cover_image_url: null,
        };
      }
    }));

    // RENDER THE BOOKS WITH COVER IMAGES.
    res.render("index.ejs", { books: booksWithImages });
  } catch (error) {
    console.error(`Error fetching or processing books: ${error.message}`);
    // Handle the error, such as sending an error response to the client
    res.status(500).send('Internal Server Error');
  }
});

// ROUTE TO FETCH AND DISPLAY NOTES FOR A SPECIFIC BOOK
app.get('/notes/:bookId', async (req, res) => {
  try {
    const bookId = req.params.bookId;
    const title = req.query.title;
    const author = req.query.author;

    // FETCH NOTES FOR THE SPECIFIC BOOK FROM THE DATABASE
    const notesResult = await db.query('SELECT * FROM notes WHERE book_id = $1', [bookId]);
    const notes = notesResult.rows;

    // RENDER THE NOTES VIEW WITH THE NOTES FOR THE SPECIFIC BOOK
    res.render('notes.ejs', { title, author, notes }); // Pass title, author, and notes
  } catch (error) {
    console.error(`Error fetching notes: ${error.message}`);
    res.status(500).send('Internal Server Error');
  }
});

// ADD A NEW BOOK - EXAMPLE POST ROUTE (COMPLETE AS NEEDED)
app.post('/add', (req, res) => {
  // Implement logic to handle adding a new book.
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
