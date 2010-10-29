dp.sh.Brushes.Mxml = function()
{
	this.CssClass = 'dp-mxml';
	this.Style =	'.dp-mxml .cdata { color: #000000; }' +
					'.dp-mxml .tag { color : #0000ff; }' +
					'.dp-mxml .tag-name { color: #0000ff; }' +
					'.dp-mxml .script { color: green; }' +
					'.dp-mxml .metadata { color: green; }' +
					'.dp-mxml .attribute { color: #000000; }' +
					'.dp-mxml .attribute-value { color: #990000; }' +
					'.dp-mxml .trace { color: #cc6666; }' +
					'.dp-mxml .var { color: #6699cc; }' +
					'.dp-mxml .comment { color: #009900; }' +
					'.dp-mxml .string { color: #990000; }' +
					'.dp-mxml .keyword { color: blue; }';
}

dp.sh.Brushes.Mxml.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.Mxml.Aliases	= ['mxml'];

dp.sh.Brushes.Mxml.prototype.ProcessRegexList = function()
{
	function push(array, value)
	{
		array[array.length] = value;
	}
	
	function isInScriptTag(array, match)
	{
		var i = 0;
		var inScript = false;
		for(i = 0; i < array.length; i++){
			if(match.index > array[i].firstIndex && match.index < array[i].lastIndex){
				inScript = true;
			}
		}
		return inScript;
	}
	
	/* If only there was a way to get index of a group within a match, the whole XML
	   could be matched with the expression looking something like that:
	
	   (<!\[CDATA\[\s*.*\s*\]\]>)
	   | (<!--\s*.*\s*?-->)
	   | (<)*(\w+)*\s*(\w+)\s*=\s*(".*?"|'.*?'|\w+)(/*>)*
	   | (</?)(.*?)(/?>)
	*/
	var index	= 0;
	var match	= null;
	var asmatch	= null;
	var regex	= null;
	var target = "";
	var scriptTags = new Array();

	var keywords =	'abstract boolean break byte case catch char class const continue debugger ' +
					'default delete do double else enum export extends false final finally float ' +
					'for function goto if implements import in instanceof int interface long native ' +
					'new null package private protected public return short static super switch ' +
					'synchronized this throw throws transient true try typeof var void volatile while with';
	var regexList = [
		{ regex: dp.sh.RegexLib.SingleLineCComments,				css: 'comment' },			// one line comments
		{ regex: dp.sh.RegexLib.MultiLineCComments,					css: 'comment' },			// multiline comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString,					css: 'string' },			// double quoted strings
		{ regex: dp.sh.RegexLib.SingleQuotedString,					css: 'string' },			// single quoted strings
		{ regex: new RegExp('^\\s*#.*', 'gm'),						css: 'preprocessor' },		// preprocessor tags like #region and #endregion
		{ regex: new RegExp(this.GetKeywords("trace"), 'gm'),		css: 'trace' },			// keywords
		{ regex: new RegExp(this.GetKeywords(keywords), 'gm'),		css: 'keyword' }			// keywords
		];

	// Match CDATA in the following format <![ ... [ ... ]]>
	// (\&lt;|<)\!\[[\w\s]*?\[(.|\s)*?\]\](\&gt;|>)
	//this.GetMatches(new RegExp('(\&lt;|<)\\!\\[[\\w\\s]*?\\[(.|\\s)*?\\]\\](\&gt;|>)', 'gm'), 'cdata');
	regex = new RegExp('\&lt;\\!\\[CDATA\\[(.|\\s)*?\\]\\]\&gt;', 'gm');
	while((match = regex.exec(this.code)) != null)
	{
		// <![CDATA[
		target = match[0].substr(0,12);
		push(this.matches, new dp.sh.Match(target, match.index, 'cdata'));
		
		// code
		target = match[0].substr(12,match[0].length-12-6);
		for(var i = 0; i < regexList.length; i++)
			while((asmatch = regexList[i].regex.exec(target)) != null)
				push(this.matches, new dp.sh.Match(asmatch[0], match.index + 12 + asmatch.index, regexList[i].css));
		
		// ]]>
		target = match[0].substr(match[0].length-6,6);
		push(this.matches, new dp.sh.Match(target, match.index + match[0].length-6, 'cdata'));
		
		scriptTags.push({firstIndex: match.index, lastIndex: match.index + match[0].length-1});
	}
	
	// Match comments
	// (\&lt;|<)!--\s*.*?\s*--(\&gt;|>)
	this.GetMatches(new RegExp('(\&lt;|<)!--\\s*.*?\\s*--(\&gt;|>)', 'gm'), 'comments');

	// Match attributes and their values
	// (:|\w+)\s*=\s*(".*?"|\'.*?\'|\w+)*
	regex = new RegExp('([:\\w-\.]+)\\s*=\\s*(".*?"|\'.*?\'|\\w+)*|(\\w+)', 'gm'); // Thanks to Tomi Blinnikka of Yahoo! for fixing namespaces in attributes
	while((match = regex.exec(this.code)) != null)
	{
		if(match[1] == null)
		{
			continue;
		}
		
		if(isInScriptTag(scriptTags, match)){
			continue;
		}
			
		push(this.matches, new dp.sh.Match(match[1], match.index, 'attribute'));
	
		// if xml is invalid and attribute has no property value, ignore it	
		if(match[2] != undefined)
		{
			push(this.matches, new dp.sh.Match(match[2], match.index + match[0].indexOf(match[2]), 'attribute-value'));
		}
	}

	// Match tag names
	// (\&lt;|<)/*\?*\s*(\w+)
	regex = new RegExp('(?:\&lt;|<)/*\\?*\\s*([:\\w-\.]+)', 'gm');
	while((match = regex.exec(this.code)) != null)
	{
		if(isInScriptTag(scriptTags, match)){
			continue;
		}
			
		target = match[0].substr(4,match[0].length-4);
		switch(target){
			case "mx:Script":
			case "/mx:Script":
				push(this.matches, new dp.sh.Match(match[0]+"&gt;", match.index, 'script'));
				break;
			case "mx:Metadata":
			case "/mx:Metadata":
				push(this.matches, new dp.sh.Match(match[0]+"&gt;", match.index, 'metadata'));
				break;
			default :
				push(this.matches, new dp.sh.Match(match[0], match.index, 'tag-name'));
				break;
		}
	}

	// Match opening and closing tag brackets
	// (\&lt;|<)/*\?*(?!\!)|/*\?*(\&gt;|>)
	regex = new RegExp('\\?&gt;|\&gt;|\/\&gt;', 'gm');
	while((match = regex.exec(this.code)) != null)
	{
		if(isInScriptTag(scriptTags, match)){
			continue;
		}
		push(this.matches, new dp.sh.Match(match[0], match.index, 'tag'));
	}
}
