var _ = require( "underscore" ),
	path = require( "path" ),
	url = require( "url" ),
	grunt = require( "grunt" );

var assetExtensions = [];
var tmplExtensions = [];

var fileRegistry = {};
var fileRegistryByPath = {};

var cdnFileRegex = /^https?:\/\//;

var kValidImageExts = [ ".jpg", ".png", ".gif", ".bmp", ".jpeg" ];

function File( obj ) {
	if( ! _.isUndefined( obj ) )
		_.extend( this, obj );
}

/** Static functions **/

File.getFilePath = function(fileNameOrObj){
	if(_.isObject(fileNameOrObj)){
		if(_.has(fileNameOrObj, "path") && _.isString(fileNameOrObj["path"])){
			return fileNameOrObj["path"];
		} else {
			throw new Error("Error: Couldnt obtain filename from "+JSON.stringify(fileNameOrObj));
		}
	} else if(_.isString(fileNameOrObj)){
		return fileNameOrObj;
	} else {
		throw new Error("Error: Couldnt guess filename from "+JSON.stringify(fileNameOrObj))
	}
}

File.getFileExtension = function( fileNameOrObj ) {
	var fileName = File.getFilePath(fileNameOrObj);
	if(File.isCDNFile(fileNameOrObj)){
		if (_.isObject(fileNameOrObj) && _.has(fileNameOrObj, "ext") && _.isString(fileNameOrObj["ext"])){
			return fileNameOrObj["ext"].substring(fileNameOrObj["ext"].lastIndexOf("."));
		} else {
			var parsedUrl = url.parse(fileName)
			var ext = parsedUrl.pathname.substring( parsedUrl.pathname.lastIndexOf( "." ) );
			if(ext === parsedUrl.pathname){
				console.log("Warning: Couldnt obtain an extension from CDN file="+fileName+", trying to guess");
				var possibleExtension = parsedUrl.pathname.substring( parsedUrl.pathname.lastIndexOf( "/" ) );
				if(possibleExtension){
					return possibleExtension;
				} else {
					console.log("Warning: Couldnt guess an extension from CDN file="+fileName+", returning JS");
					return "js";
				}
			}
		}
		return ext;
	} else {
		return fileName.substring( fileName.lastIndexOf( "." ) );
	}
};

File.setAssetExtensions = function( extensions ) {
	assetExtensions = extensions;
};

File.setTmplExtensions = function( extensions ) {
	tmplExtensions = extensions;
};

File.isAssetFileName = function( fileName ) {
	return _.contains( assetExtensions, this.getFileExtension( fileName ) );
};

File.addToRegistry = function( file ) {
	fileRegistry[ file.getSource() ] = file;
};

File.clearRegistry = function( file ) {
	fileRegistry = {};
};

File.getFromRegistry = function( filePath ) {
	return fileRegistry[ filePath ];
};

File.getFromRegistryByPath = function( filePath ) {
	return fileRegistryByPath [ filePath ];
};

File.rebuildRegistries = function() {
	fileRegistryByPath = {};

	_.each( fileRegistry, function( file ) {
		fileRegistryByPath[ file.path ] = file;
	} );
};

File.createAndRegister = function( options ) {
	var file = new File( options );
	File.addToRegistry( file );
	return file;
};

File.isImageFileName = function( fileName ) {
	return _.contains( kValidImageExts, File.getFileExtension( fileName ) );
};

File.isCDNFile = function( fileNameOrObj ) {
	if(_.isObject(fileNameOrObj) && _.has(fileNameOrObj, "remote") && _.isBoolean(fileNameOrObj["remote"])){
		return fileNameOrObj["remote"];
	}
	var fileName = File.getFilePath(fileNameOrObj);
	return cdnFileRegex.test( fileName );
};

File.getFilesByType = function( files ) {
	var filesByType = {};

	_.each( files , function( file ) {
		var fileType = file.getFileType();
		filesByType[ fileType ] = filesByType [ fileType ] || [];
		filesByType[ fileType ].push( file.path );
	} );

	return filesByType;
};

File.mapAssetFileName = function( fileName, assetExtensionMap ) {
	// don't map CDN file names
	if( File.isCDNFile( fileName ) ) {
		return fileName;
	}
	var fileExt = File.getFileExtension( fileName );
	var outExt = assetExtensionMap[ fileExt ];

	if( ! _.isUndefined( outExt ) )
		return fileName.substring( 0, fileName.lastIndexOf( "." ) ) + outExt;
	else
		return fileName;
};

/** Public functions **/

File.prototype = {
	getFileType : function() {
		var extension = this.getFileExtension();

		if( _.contains( tmplExtensions, extension ) )
			return "tmpl";
		else
			return extension.substring( 1 );
	},
	getFileExtension : function() {
		if (_.isObject(this.src)){
			return File.getFileExtension( this.src );
		} else {
			return File.getFileExtension(this.path );
		}
	},
	getSource: function(){
		if (_.isObject(this.src)) {
			if(_.has(this.src, "path") && _.isString(this.src["path"])){
				return this.src["path"];
			} else {
				throw new Error("Error: File should have a path but it doesnt="+JSON.stringify(this.src));
			}
		} else if (_.isString(this.src)){
			return this.src;
		} else {
			throw new Error("Error: File should have a path but it doesnt="+JSON.stringify(this.src));
		}
	},
	copy : function( srcDir, destDir ) {
		// for CDN files, copy the src to the path, but don't do the actual file copy
		if( File.isCDNFile( this.src ) ) {
			this.path = this.getSource();
		}
		else {
			var destPath = path.join( destDir, path.relative( srcDir, this.getSource() ) );
			grunt.file.copy( this.getSource(),  destPath );
			this.path = destPath;
		}
	}
};

module.exports = File;
