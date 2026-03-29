require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

const facebookPageId = process.env.FACEBOOK_PAGE_ID;
const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

/**
 * Post an image to Facebook Page
 * @param {string} imagePath - Local path to image file
 * @param {string} caption - Caption/message for the post
 * @returns {Object} - {post_id, success}
 */
async function postImageToFacebook(imagePath, caption) {
  try {
    console.log('📸 Posting image to Facebook Page...');

    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Create form data with image
    const form = new FormData();
    form.append('source', fs.createReadStream(imagePath));
    form.append('message', caption);
    form.append('access_token', accessToken);
    form.append('published', 'true');

    // Post to Facebook Page photos endpoint
    const url = `https://graph.facebook.com/v19.0/${facebookPageId}/photos`;

    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (response.data && response.data.id) {
      const postId = response.data.id;
      console.log(`✅ Image posted successfully! Post ID: ${postId}`);
      console.log(`🔗 View: https://www.facebook.com/${postId}`);

      return {
        post_id: postId,
        success: true,
        url: `https://www.facebook.com/${postId}`
      };
    } else {
      console.error('⚠️ Unexpected response from Facebook:', response.data);
      return { success: false };
    }

  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error('❌ Error posting image to Facebook:', errorMsg);

    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Post a text-only update to Facebook Page
 * @param {string} message - Text message to post
 * @returns {Object} - {post_id, success}
 */
async function postTextToFacebook(message) {
  try {
    console.log('📝 Posting text update to Facebook Page...');

    const url = `https://graph.facebook.com/v19.0/${facebookPageId}/feed`;

    const response = await axios.post(url, null, {
      params: {
        message: message,
        access_token: accessToken,
      }
    });

    if (response.data && response.data.id) {
      const postId = response.data.id;
      console.log(`✅ Text posted successfully! Post ID: ${postId}`);
      console.log(`🔗 View: https://www.facebook.com/${postId}`);

      return {
        post_id: postId,
        success: true,
        url: `https://www.facebook.com/${postId}`
      };
    } else {
      console.error('⚠️ Unexpected response from Facebook:', response.data);
      return { success: false };
    }

  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error('❌ Error posting text to Facebook:', errorMsg);

    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Comment on a Facebook post
 * @param {string} postId - Facebook post ID
 * @param {string} message - Comment text
 * @returns {Object} - {comment_id, success}
 */
async function commentOnPost(postId, message) {
  try {
    console.log(`💬 Commenting on post ${postId}...`);

    const url = `https://graph.facebook.com/v19.0/${postId}/comments`;

    const response = await axios.post(url, null, {
      params: {
        message: message,
        access_token: accessToken,
      }
    });

    if (response.data && response.data.id) {
      const commentId = response.data.id;
      console.log(`✅ Comment posted! Comment ID: ${commentId}`);
      console.log(`   Message: "${message}"`);

      return {
        comment_id: commentId,
        success: true
      };
    } else {
      console.error('⚠️ Unexpected response from Facebook:', response.data);
      return { success: false };
    }

  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error('❌ Error posting comment:', errorMsg);

    // Don't throw - commenting failure shouldn't break the flow
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Get post details (for verification/analytics)
 * @param {string} postId - Facebook post ID
 * @returns {Object} - Post data
 */
async function getPostDetails(postId) {
  try {
    const url = `https://graph.facebook.com/v19.0/${postId}`;

    const response = await axios.get(url, {
      params: {
        fields: 'id,message,created_time,permalink_url,likes.summary(true),comments.summary(true),shares',
        access_token: accessToken,
      }
    });

    return {
      success: true,
      data: response.data
    };

  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error('❌ Error getting post details:', errorMsg);

    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Delete a post (for testing/cleanup)
 * @param {string} postId - Facebook post ID
 * @returns {Object} - {success}
 */
async function deletePost(postId) {
  try {
    console.log(`🗑️ Deleting post ${postId}...`);

    const url = `https://graph.facebook.com/v19.0/${postId}`;

    const response = await axios.delete(url, {
      params: {
        access_token: accessToken,
      }
    });

    if (response.data && response.data.success) {
      console.log(`✅ Post deleted successfully`);
      return { success: true };
    } else {
      return { success: false };
    }

  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    console.error('❌ Error deleting post:', errorMsg);

    return {
      success: false,
      error: errorMsg
    };
  }
}

module.exports = {
  postImageToFacebook,
  postTextToFacebook,
  commentOnPost,
  getPostDetails,
  deletePost
};
