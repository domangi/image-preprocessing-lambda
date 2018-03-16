var async = require('async');
var AWS = require('aws-sdk');
var gm = require('gm').subClass({ imageMagick: true });
var s3 = new AWS.S3();

var SIZES = ["800x600", "400x300"];

exports.handler = function(event, context) {
    var message, srcKey, dstKey, srcBucket, dstBucket, filename;
    message = JSON.parse(event.Records[0].Sns.Message).Records[0];

    srcBucket = message.s3.bucket.name;
    dstBucket = srcBucket;
    srcKey    =  message.s3.object.key.replace(/\+/g, " "); // undo white space replacement
    filename = srcKey.split("/")[1];
    dstKey = ""; // WIDTHxHEIGHT/filename

    // Infer the image type
    var typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        var err_message='Unable to infer image type for ' + srcKey;
        console.error(err_message);
        return context.done();
    }
    var imageType = typeMatch[1];
    if (imageType != "jpeg" && imageType != "jpg" && imageType != "JPG" && imageType != "png" && imageType != "PNG") {
        var err_message = 'Skipping non-image ' + srcKey;
        console.log(err_message);
        return context.done();
    }

    // Download the image from S3
    s3.getObject({
            Bucket: srcBucket,
            Key: srcKey
    }, function(err, response){
        if (err){
            var err_message = 'Cannot download image: ' + srcKey + " - " + err;
            return console.error(err_message);
        }

        var contentType = response.ContentType;

        // Pass in our image to ImageMagick
        var original = gm(response.Body);

        // Obtain the size of the image
        original.size(function(err, size){
            if(err){
                return console.error(err);
            }

            // For each SIZES, call the resize function
            async.each(SIZES, function (width_height,  callback) {
                var filename = srcKey.split("/")[1];
                var thumbDstKey = width_height +"/" + filename;
                resize(size, width_height, imageType, original, srcKey, dstBucket, thumbDstKey, contentType, callback);
            },
            function (err) {
                if (err) {
                    var err_message = 'Cannot resize ' + srcKey + 'error: ' + err;
                    console.error(err_message);
                }
                context.done();
            });
        });
    });
};

var resize = function(size, width_height, imageType, original, srcKey, dstBucket, dstKey, contentType) {
    async.waterfall([
        function transform(next) {
            var width_height_values = width_height.split("x");
            var width  = width_height_values[0];
            var height = width_height_values[1];

            // Transform the image buffer in memory
            original.interlace("Plane")
                .quality(80)
                .resize(width, height, '^')
                .gravity('Center')
                .crop(width, height)
                .toBuffer(imageType, function(err, buffer) {
                if (err) {
                    next(err);
                } else {
                    next(null, buffer);
                }
            });
        },
        function upload(data, next) {
            console.log("Uploading data to " + dstKey);
            s3.putObject({
                    Bucket: dstBucket,
                    Key: dstKey,
                    Body: data,
                    ContentType: contentType,
                    ACL: 'public-read'
                },
                next);
            }
        ], function (err) {
            if (err) {
                console.error(err);
            }
        }
    );
};
