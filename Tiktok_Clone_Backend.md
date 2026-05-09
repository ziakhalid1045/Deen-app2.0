# TikTok/YouTube Style Content Feed System

Here is the complete backend structure, API endpoints, and sorting/ranking logic using Node.js, Express, and MongoDB.

## 1. Backend Structure & Setup

Create a new directory for your backend, initialize it, and install dependencies:

```bash
mkdir video-backend
cd video-backend
npm init -y
npm install express mongoose cors dotenv multer
```

**Directory Structure:**
```text
/video-backend
│── /models
│   ├── User.js
│   └── Post.js
│── /routes
│   ├── auth.js
│   └── feed.js
│── server.js
└── .env
```

## 2. Database Models (MongoDB)

### `models/User.js`
```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  profilePicture: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
```

### `models/Post.js`
```javascript
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true }, // e.g., Islamic, News, Poetry
  tags: [String],
  videoUrl: { type: String, required: true }, // URL after uploading to S3 / Cloudinary
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
```

## 3. Feed Ranking Logic & API Endpoints

### `server.js` (Main Express Application)
```javascript
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Post = require('./models/Post');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/videofeed')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(err));

// ==========================================
// API: UPLOAD CONTENT
// ==========================================
app.post('/api/posts', async (req, res) => {
  try {
    // In a real app, you would use 'multer' to handle the file upload 
    // and upload the file to AWS S3 or Cloudinary before saving the URL to MongoDB.
    const newPost = new Post({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      tags: req.body.tags,
      videoUrl: req.body.videoUrl, // assumed uploaded URL
      author: req.body.authorId
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API: LIKE POST & TRACK VIEWS
// ==========================================
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id, 
      { $inc: { likes: 1 } }, // Increment likes by 1
      { new: true }
    );
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts/:id/view', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id, 
      { $inc: { views: 1 } } // Increment views by 1
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API: FETCH "LATEST" FEED (Sorted by newest)
// ==========================================
app.get('/api/feed/latest', async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    const query = category ? { category } : {};

    const posts = await Post.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .skip((page - 1) * limit) // Pagination logic
      .limit(Number(limit))
      .populate('author', 'username profilePicture');

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API: FETCH "POPULAR" FEED (Most liked)
// ==========================================
app.get('/api/feed/popular', async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    const query = category ? { category } : {};

    const posts = await Post.find(query)
      .sort({ likes: -1, views: -1 }) // Most liked and viewed
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('author', 'username profilePicture');

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// API: FETCH "TRENDING" FEED (Custom Ranking)
// ==========================================
app.get('/api/feed/trending', async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    
    // Build Match Query for category filtering
    const matchQuery = category ? { category } : {};

    // MongoDB Aggregation Pipeline for Custom Ranking
    const posts = await Post.aggregate([
      { $match: matchQuery },
      
      // Look up Author Details
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'authorInfo'
        }
      },
      { $unwind: "$authorInfo" },

      // Calculate Age in Hours and the Final Score
      {
        $addFields: {
          ageInHours: {
            $divide: [
              { $subtract: [new Date(), "$createdAt"] },
              1000 * 60 * 60 // milliseconds to hours
            ]
          }
        }
      },
      {
        $addFields: {
           // Score = (likes * 2) + (views * 1.5) + (recent boost)
           // Recent boost = 100 / (ageInHours + 1) -> Newer posts get a larger boost
           rankingScore: {
              $add: [
                { $multiply: ["$likes", 2] },
                { $multiply: ["$views", 1.5] },
                { $divide: [100, { $add: ["$ageInHours", 1] }] }
              ]
           }
        }
      },
      
      // Sort by the newly calculated ranking score
      { $sort: { rankingScore: -1 } },
      
      // Apply Pagination
      { $skip: (page - 1) * Number(limit) },
      { $limit: Number(limit) },

      // Cleanup output fields (optional)
      { 
        $project: {
          ageInHours: 0 // hide from frontend
        } 
      }
    ]);

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

## How the Ranking Formula Works:
When the client calls `/api/feed/trending?page=1`, MongoDB performs an aggregation:
1. Calculates the **Age in Hours** of the post.
2. Calculates the **Recent Boost**: `100 / (age + 1)`. A 0-hour old post gets +100 points. A 10-hour old post gets +9 points.
3. Multiplies **Likes** by `2.0` and **Views** by `1.5` and adds them to the boost.
4. Generates a custom `rankingScore` field in real-time, sorts all available posts by this field, and accurately returns the top-ranked feed.

This approach is extremely scalable for a medium-to-large dataset because MongoDB aggregation handles the mathematics efficiently.
