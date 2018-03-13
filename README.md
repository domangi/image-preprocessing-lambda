## Kalulu Avatar Resize Lambda

This lambda function allows to process uploaded user avatars and genereate resized
and optimizes squared avatars

## High level architecture

This code is one block of a serverless architecture on AWS for image preprocessing.
Everytime an image is upload in a given folder on S3, this lambda function will
generated the processed version and will save it into another folder on S3

The complete architecture is as follows:

1. An S3 folder configured with an Event (Object Create ALL)
2. An SNS Topic on which the triggered S3 events is published
3. A Lambda function (this) subscribed to the sns topic, in charge of processing the new image that generated the event, and uploading the generated image to S3

The complete process will be:

1. A new image is uploaded to the configured folder on S3
2. S3 publishes a notification on the configured SNS Topic telling about the new file
3. This lambda function, subscribed to the SNS Topic takes the new uploaded images, processes it and uploads it again on s3

## Setup

A complete description and step-by-step tutorial of the AWS architecture setup can be found here: ...
