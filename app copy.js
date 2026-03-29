require('dotenv').config();
const { execSync, exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

const videoUrl = "https://down-ws-sg.vod.susercontent.com/api/v4/11110105/mms/sg-11110105-6v8hp-mg5ukglwzpjj8d.16000081761180200.mp4";
const outputFileName = "youtube_video.mp4";
const outputPath = path.join(__dirname, outputFileName);

const facebookPageId = process.env.FACEBOOK_PAGE_ID;
const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const outputDirectory = __dirname; // Directory where videos are saved

// Step 1: Get YouTube Video Title & Description
function getYouTubeMetadata(url) {
    try {
        console.log("🔍 Fetching YouTube video metadata...");
        const title = execSync(`yt-dlp --print "%(title)s" ${url}`).toString().trim();
        const description = execSync(`yt-dlp --print "%(description)s" ${url}`).toString().trim();
        console.log(`✅ Title: ${title}`);
        console.log(`✅ Description: ${description}`);
        return { title, description };
    } catch (error) {
        console.error("❌ Error fetching metadata:", error.message);
        process.exit(1);
    }
}

// Step 2: Download YouTube Video
function downloadYouTubeVideo() {
    return new Promise((resolve, reject) => {
        console.log("⬇️ Downloading video...");
        const command = `yt-dlp -f "bestvideo+bestaudio" --merge-output-format mp4 -o "${outputPath}" ${videoUrl}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Error downloading video: ${stderr}`);
                return reject(error);
            }
            console.log(`✅ Download complete: ${outputPath}`);
            resolve(outputPath);
        });
    });
}

// Step 3: Find the Downloaded Video File
function findMP4File() {
    const files = fs.readdirSync(outputDirectory);
    const mp4File = files.find(file => file.endsWith('.mp4'));
    if (!mp4File) {
        throw new Error("❌ No .mp4 file found after download!");
    }
    console.log(`✅ Found video file: ${mp4File}`);
    return path.join(outputDirectory, mp4File);
}

// Step 4: Upload Video to Facebook Reels
async function uploadToFacebookReels(videoPath, title, description) {
    try {
        console.log("🚀 Starting Facebook Reel Upload...");
        const fileSize = fs.statSync(videoPath).size;
        const startUrl = `https://graph.facebook.com/v19.0/${facebookPageId}/video_reels`;

        // Step 4A: Start Upload Session
        const startResponse = await axios.post(startUrl, {
            access_token: accessToken,
            upload_phase: 'start'
        });

        console.log("✅ Facebook API Response (START):", startResponse.data);

        if (!startResponse.data.video_id) {
            throw new Error("❌ Missing video_id. Check API response!");
        }

        const { video_id } = startResponse.data;
        const uploadUrl = `https://rupload.facebook.com/video-upload/v19.0/${video_id}`;

        // Step 4B: Upload Video Using Resumable Upload API
        const videoBuffer = fs.readFileSync(videoPath);
        const uploadHeaders = {
            Authorization: `OAuth ${accessToken}`,
            offset: "0",
            "file_size": fileSize,
            "Content-Length": fileSize,
            "Content-Type": "application/octet-stream"
        };

        const uploadResponse = await axios.post(uploadUrl, videoBuffer, { headers: uploadHeaders });

        console.log("✅ Facebook API Response (UPLOAD):", uploadResponse.data);

        // Step 4C: Finish Upload & Publish
        await completeAndPublishVideo(video_id, title, description);
    } catch (error) {
        console.error("❌ Error uploading to Facebook Reels:", error.response ? error.response.data : error.message);
    }
}

// Step 5: Complete the upload and publish the video
async function completeAndPublishVideo(videoId, title, description) {
    try {
        const url = `https://graph.facebook.com/v19.0/${facebookPageId}/video_reels`;
        const params = {
            access_token: accessToken,
            video_id: videoId,
            upload_phase: "finish",
            video_state: "PUBLISHED",
            title: title,
            description: description,
        };

        const response = await axios.post(url, null, { params });

        console.log("✅ Video published successfully:", response.data);
        console.log(`🎉 Reel successfully uploaded! View Reel: https://www.facebook.com/${facebookPageId}/videos/${videoId}`);
    } catch (error) {
        console.error("❌ Error publishing video:", error.response ? error.response.data : error.message);
    }
}

// Step 6: Run the process
async function main() {
    try {
        // Step 1: Get video metadata
        const { title, description } = getYouTubeMetadata(videoUrl);

        // Step 2: Download the video
        await downloadYouTubeVideo();

        // Step 3: Find the downloaded video file
        const videoPath = findMP4File();

        // Step 4: Upload to Facebook with dynamic title & description
        await uploadToFacebookReels(videoPath, title, description);

        console.log("🎉 Process completed successfully!");
    } catch (error) {
        console.error("❌ Process failed:", error);
    }
}

main();


// require('dotenv').config();
// const { exec } = require('child_process');
// const fs = require('fs');
// const axios = require('axios');
// const path = require('path');

// const videoUrl = "https://www.youtube.com/shorts/5f7E4DQG6kk";
// const videoTitle = "GET UP AND GRIND - Motivational Speech";
// const videoDesc = `No more excuses—it's time to chase your dreams, put in the work, and make it happen. Success doesn’t come to those who wait—it comes to those who HUSTLE. 💯🔥

// Tag someone who needs this motivation today! 🚀 #GetUpAndGrind #Motivation #HustleHard #NoExcuses`;


// const outputFileName = "youtube_video.mp4";
// const outputPath = path.join(__dirname, outputFileName);

// const facebookPageId = process.env.FACEBOOK_PAGE_ID;
// const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
// const outputDirectory = __dirname; // Directory where videos are saved

// // Step 1: Check Access Token & Permissions
// async function validatePermissions() {
//     try {
//         const response = await axios.get(`https://graph.facebook.com/v19.0/me/permissions`, {
//             params: { access_token: accessToken }
//         });
//         console.log("✅ Permissions Check:", response.data);

//         const missingPermissions = ["pages_manage_posts", "publish_video"].filter(
//             perm => !response.data.data.some(p => p.permission === perm && p.status === "granted")
//         );

//         if (missingPermissions.length) {
//             throw new Error(`❌ Missing Permissions: ${missingPermissions.join(', ')}`);
//         }
//     } catch (error) {
//         console.error("❌ Error Checking Permissions:", error.response ? error.response.data : error.message);
//         process.exit(1);
//     }
// }

// // Step 2: Download YouTube Shorts using yt-dlp
// // function downloadYouTubeVideo() {
// //     return new Promise((resolve, reject) => {
// //         //const command =  `yt-dlp -f "bestvideo+bestaudio" --merge-output-format mp4 -o "${outputPath}" ${videoUrl}`
// //         //const command = `yt-dlp -f best -o "${outputPath}" ${videoUrl}`;
// //         //const command =  `yt-dlp -f "bv*[height>=960]+ba/b" --merge-output-format mp4 -o "${outputPath}" ${videoUrl}`;
// //         const command = `yt-dlp -f "bestvideo[height>=960]+bestaudio/best" -o "${outputPath}" ${videoUrl}`;
// //         exec(command, (error, stdout, stderr) => {
// //             if (error) {
// //                 console.error(`❌ Error downloading video: ${stderr}`);
// //                 return reject(error);
// //             }
// //             console.log(`✅ Download complete: ${outputPath}`);
// //             resolve(outputPath);
// //         });
// //     });
// // }


// function downloadYouTubeVideo() {
//     return new Promise((resolve, reject) => {
//         const command = `yt-dlp -f "bestvideo+bestaudio" --merge-output-format mp4 --ffmpeg-location $(which ffmpeg) -o "${outputPath}" ${videoUrl}`;
//         //const command = `yt-dlp -f "bv+ba/best" --merge-output-format mp4 -o "${outputPath}" ${videoUrl}`;
//         exec(command, (error, stdout, stderr) => {
//             if (error) {
//                 console.error(`❌ Error downloading video: ${stderr}`);
//                 return reject(error);
//             }
//             console.log(`✅ Download complete: ${outputPath}`);
//             resolve(outputPath);
//         });
//     });
// }

// // Step 3: Automatically detect the .mp4 file
// function findMP4File() {
//     const files = fs.readdirSync(outputDirectory);
//     const mp4File = files.find(file => file.endsWith('.mp4'));

//     if (!mp4File) {
//         throw new Error("❌ No .mp4 file found after download!");
//     }

//     console.log(`✅ Found video file: ${mp4File}`);
//     return path.join(outputDirectory, mp4File);
// }

// // Step 4: Upload video to Facebook Reels
// async function uploadToFacebookReels(videoPath) {
//     try {
//         console.log("🚀 Starting Facebook Reel Upload...");

//         const fileSize = fs.statSync(videoPath).size;
//         const startUrl = `https://graph.facebook.com/v19.0/${facebookPageId}/video_reels`;

//         // Step 4A: Start Upload Session
//         const startResponse = await axios.post(startUrl, {
//             access_token: accessToken,
//             upload_phase: 'start'
//         });

//         console.log("✅ Facebook API Response (START):", startResponse.data);

//         if (!startResponse.data.video_id) {
//             throw new Error("❌ Missing video_id. Check API response!");
//         }

//         const { video_id } = startResponse.data;
//         const uploadUrl = `https://rupload.facebook.com/video-upload/v19.0/${video_id}`;

//         // Step 4B: Upload Video Using Resumable Upload API
//         const videoBuffer = fs.readFileSync(videoPath);
//         const uploadHeaders = {
//             Authorization: `OAuth ${accessToken}`,
//             offset: "0",
//             "file_size": fileSize,
//             "Content-Length": fileSize,
//             "Content-Type": "application/octet-stream"
//         };

//         const uploadResponse = await axios.post(uploadUrl, videoBuffer, { headers: uploadHeaders });

//         console.log("✅ Facebook API Response (UPLOAD):", uploadResponse.data);

//         // Step 4C: Finish Upload & Publish
//         await completeAndPublishVideo(video_id);

//     } catch (error) {
//         console.error("❌ Error uploading to Facebook Reels:", error.response ? error.response.data : error.message);
//     }
// }

// // Step 5: Complete the upload and publish the video
// async function completeAndPublishVideo(videoId) {
//     try {
//         const url = `https://graph.facebook.com/v19.0/${facebookPageId}/video_reels`;
//         const params = {
//             access_token: accessToken,
//             video_id: videoId,
//             upload_phase: "finish",
//             video_state: "PUBLISHED",
//             title: videoTitle,
//             description: videoDesc,
//         };

//         const response = await axios.post(url, null, { params });

//         console.log("✅ Video published successfully:", response.data);
//         console.log(`🎉 Reel successfully uploaded! View Reel: https://www.facebook.com/${facebookPageId}/videos/${videoId}`);
//     } catch (error) {
//         console.error("❌ Error publishing video:", error.response ? error.response.data : error.message);
//     }
// }

// // Step 6: Run the process
// async function main() {
//     try {
//         //await validatePermissions(); // ✅ Check token permissions first
//         await downloadYouTubeVideo();
//         const videoPath = findMP4File();
//         await uploadToFacebookReels(videoPath);
//         console.log("🎉 Process completed successfully!");
//     } catch (error) {
//         console.error("❌ Process failed:", error);
//     }
// }

// main();