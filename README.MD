These are for converting my old models and making little scripts to alter commonly needed updates that I can't be bothered to do manually.

You may need to alter the scripts slightly for your use cases.

# Troubleshooting
Make sure you remove any extra code outside the constructors as it may detect those with the regex.

Or at least make sure there are no clashing names as local variables.
You can remove the optional checker in the regex for "this." if you explicitly use that in your models.

# Command Syntax
`node utils.js updatemodel (input glob) (output location) [ignoreMissingParts]`