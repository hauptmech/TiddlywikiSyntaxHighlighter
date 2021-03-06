/***
 * Code Syntax Highlighter Derivative.
 * Version 1.5.2
 * Copyright (C) 2004-2007 Alex Gorbatchev.
 * http://www.dreamprojections.com/syntaxhighlighter/
 * 
 * This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General 
 * Public License as published by the Free Software Foundation; either version 2.1 of the License, or (at your option) 
 * any later version.
 *
 * This library is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied 
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more 
 * details.
 *
 * You should have received a copy of the GNU Lesser General Public License along with this library; if not, write to 
 * the Free Software Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA 
 *


!Metadata:
|''Name:''|SyntaxHighlighterPlugin|
|''Description:''|Code Syntax Highlighter Plugin for TiddlyWiki.|
|''Version:''|1.5.2|
|''Date:''|Oct 24, 2008|
|''Source:''|git://github.com/hauptmech/TiddlywikiSyntaxHighlighter.git|
|''Author:''|Various|
|''License:''|[[GNU Lesser General Public License|http://www.gnu.org/licenses/lgpl.txt]]|
|''~CoreVersion:''|2.6.2|

!Syntax:
{{{
<code options>
codes
</code>
}}}

!Examples:
{{{
<code java>
public class HelloWorld {
    public static void main(String args[]) {
        System.out.println("HelloWorld!");
    }
}
</code>
}}}

!Revision History:
|''Version''|''Date''|''Note''|
|1.5.2|Jun 14, 2011|Add cys & peg syntaxes, improve keyword matching|
|1.1.2|Oct 15, 2008|Optimize Highlight|
|1.0.0|Oct 13, 2008|Initial release|

!Code section:
***/
//{{{
/*
Note: When processing the text remember it's html and &,<,> are all 
escaped as &amp; etc.

*/

var dp = {
	sh :
	{
		Toolbar : {},
		Utils	: {},
		RegexLib: {},
		Brushes	: {},
		Strings : {
			AboutDialog : '<html><head><title>About...</title></head><body class="dp-about"><table cellspacing="0"><tr><td class="copy"><p class="title">dp.SyntaxHighlighter</div><div class="para">Version: {V}</p><p><a href="http://www.dreamprojections.com/syntaxhighlighter/?ref=about" target="_blank">http://www.dreamprojections.com/syntaxhighlighter</a></p>&copy;2004-2007 Alex Gorbatchev.</td></tr><tr><td class="footer"><input type="button" class="close" value="OK" onClick="window.close()"/></td></tr></table></body></html>'
		},
		ClipboardSwf : null,
		Version : '1.5.1'
	}
};

// make an alias
dp.SyntaxHighlighter = dp.sh;

//
// Toolbar functions
//

dp.sh.Toolbar.Commands = {
	ExpandSource: {
		label: '+ expand source',
		check: function(highlighter) { return highlighter.collapse; },
		func: function(sender, highlighter)
		{
			sender.parentNode.removeChild(sender);
			highlighter.div.className = highlighter.div.className.replace('collapsed', '');
		}
	},
	
	// opens a new windows and puts the original unformatted source code inside.
	ViewSource: {
		label: 'view plain',
		func: function(sender, highlighter)
		{
			var code = dp.sh.Utils.FixForBlogger(highlighter.originalCode).replace(/</g, '&lt;');
			var wnd = window.open('', '_blank', 'width=750, height=400, location=0, resizable=1, menubar=0, scrollbars=0');
			wnd.document.write('<textarea style="width:99%;height:99%">' + code + '</textarea>');
			wnd.document.close();
		}
	},
	
	// Copies the original source code in to the clipboard. Uses either IE only method or Flash object if ClipboardSwf is set
	CopyToClipboard: {
		label: 'copy to clipboard',
		check: function() { return window.clipboardData != null || dp.sh.ClipboardSwf != null; },
		func: function(sender, highlighter)
		{
			var code = dp.sh.Utils.FixForBlogger(highlighter.originalCode)
				.replace(/&lt;/g,'<')
				.replace(/&gt;/g,'>')
				.replace(/&amp;/g,'&')
			;
			
			if(window.clipboardData)
			{
				window.clipboardData.setData('text', code);
			}
			else if(dp.sh.ClipboardSwf != null)
			{
				var flashcopier = highlighter.flashCopier;
				
				if(flashcopier == null)
				{
					flashcopier = document.createElement('div');
					highlighter.flashCopier = flashcopier;
					highlighter.div.appendChild(flashcopier);
				}
				
				flashcopier.innerHTML = '<embed src="' + dp.sh.ClipboardSwf + '" FlashVars="clipboard='+encodeURIComponent(code)+'" width="0" height="0" type="application/x-shockwave-flash"></embed>';
			}
			
			alert('The code is in your clipboard now');
		}
	},
	
	// creates an invisible iframe, puts the original source code inside and prints it
	PrintSource: {
		label: 'print',
		func: function(sender, highlighter)
		{
			var iframe = document.createElement('IFRAME');
			var doc = null;

			// this hides the iframe
			iframe.style.cssText = 'position:absolute;width:0px;height:0px;left:-500px;top:-500px;';
			
			document.body.appendChild(iframe);
			doc = iframe.contentWindow.document;

			dp.sh.Utils.CopyStyles(doc, window.document);
			doc.write('<div class="' + highlighter.div.className.replace('collapsed', '') + ' printing">' + highlighter.div.innerHTML + '</div>');
			doc.close();

			iframe.contentWindow.focus();
			iframe.contentWindow.print();
			
			alert('Printing...');
			
			document.body.removeChild(iframe);
		}
	},
	
	About: {
		label: '?',
		func: function(highlighter)
		{
			var wnd	= window.open('', '_blank', 'dialog,width=300,height=150,scrollbars=0');
			var doc	= wnd.document;

			dp.sh.Utils.CopyStyles(doc, window.document);
			
			doc.write(dp.sh.Strings.AboutDialog.replace('{V}', dp.sh.Version));
			doc.close();
			wnd.focus();
		}
	}
};

// creates a <div /> with all toolbar links
dp.sh.Toolbar.Create = function(highlighter)
{
	var div = document.createElement('DIV');
	
	div.className = 'tools';
	
	for(var name in dp.sh.Toolbar.Commands)
	{
		var cmd = dp.sh.Toolbar.Commands[name];
		
		if(cmd.check != null && !cmd.check(highlighter))
			continue;
		
		div.innerHTML += '<a href="#" onclick="dp.sh.Toolbar.Command(\'' + name + '\',this);return false;">' + cmd.label + '</a>';
	}
	
	return div;
}

// executes toolbar command by name
dp.sh.Toolbar.Command = function(name, sender)
{
	var n = sender;
	
	while(n != null && n.className.indexOf('dp-highlighter') == -1)
		n = n.parentNode;
	
	if(n != null)
		dp.sh.Toolbar.Commands[name].func(sender, n.highlighter);
}

// copies all <link rel="stylesheet" /> from 'target' window to 'dest'
dp.sh.Utils.CopyStyles = function(destDoc, sourceDoc)
{
	var links = sourceDoc.getElementsByTagName('link');

	for(var i = 0; i < links.length; i++)
		if(links[i].rel.toLowerCase() == 'stylesheet')
			destDoc.write('<link type="text/css" rel="stylesheet" href="' + links[i].href + '"></link>');
}

dp.sh.Utils.FixForBlogger = function(str)
{
	return (dp.sh.isBloggerMode == true) ? str.replace(/<br\s*\/?>|&lt;br\s*\/?&gt;/gi, '\n') : str;
}

//
// Common reusable regular expressions
//
dp.sh.RegexLib = {
	MultiLineCysComments: /_\*[\s\S]*?\*_/gm,
	SingleLineCysComments: /\s_\s.*$/gm,
	MultiLineCComments : new RegExp('/\\*[\\s\\S]*?\\*/', 'gm'),
	SingleLineCComments : new RegExp('//.*$', 'gm'),
	SingleLinePerlComments : new RegExp('#.*$', 'gm'),
	DoubleQuotedString : /"(?:\.|(\\\")|[^\""\n])*"/g,
	SingleQuotedString : /'(?:\.|(\\\')|[^\''\n])*'/g
};

//
// Match object
//
dp.sh.Match = function(value, index, css)
{
	this.value = value;
	this.index = index;
	this.length = value.length;
	this.css = css;
}

//
// Highlighter object
//
dp.sh.Highlighter = function()
{
	this.noGutter = false;
	this.addControls = true;
	this.collapse = false;
	this.tabsToSpaces = true;
	this.wrapColumn = 80;
	this.showColumns = true;
}

// static callback for the match sorting
dp.sh.Highlighter.SortCallback = function(m1, m2)
{
	// sort matches by index first
	if(m1.index < m2.index)
		return -1;
	else if(m1.index > m2.index)
		return 1;
	else
	{
		// if index is the same, sort by length
		if(m1.length < m2.length)
			return -1;
		else if(m1.length > m2.length)
			return 1;
	}
	return 0;
}

dp.sh.Highlighter.prototype.CreateElement = function(name)
{
	var result = document.createElement(name);
	result.highlighter = this;
	return result;
}

// gets a list of all matches for a given regular expression
dp.sh.Highlighter.prototype.GetMatches = function(regex, css)
{
	var index = 0;
	var match = null;

	while((match = regex.exec(this.code)) != null)
		this.matches[this.matches.length] = new dp.sh.Match(match[0], match.index, css);
}

dp.sh.Highlighter.prototype.AddBit = function(str, css)
{
	if(str == null || str.length == 0)
		return;

	var span = this.CreateElement('SPAN');
	
//	str = str.replace(/&/g, '&amp;');
	str = str.replace(/ /g, '&nbsp;')
//	str = str.replace(/</g, '&lt;');
//	str = str.replace(/>/g, '&gt;');
	str = str.replace(/\n/gm, '&nbsp;<br>');

	// when adding a piece of code, check to see if it has line breaks in it 
	// and if it does, wrap individual line breaks with span tags
	if(css != null)
	{
		if((/br/gi).test(str))
		{
			var lines = str.split('&nbsp;<br>');
			
			for(var i = 0; i < lines.length; i++)
			{
				span = this.CreateElement('SPAN');
				span.className = css;
				span.innerHTML = lines[i];
				
				this.div.appendChild(span);
				
				// don't add a <BR> for the last line
				if(i + 1 < lines.length)
					this.div.appendChild(this.CreateElement('BR'));
			}
		}
		else
		{
			span.className = css;
			span.innerHTML = str;
			this.div.appendChild(span);
		}
	}
	else
	{
		span.innerHTML = str;
		this.div.appendChild(span);
	}
}

// checks if one match is inside any other match
dp.sh.Highlighter.prototype.IsInside = function(match)
{
	if(match == null || match.length == 0)
		return false;
	
	for(var i = 0; i < this.matches.length; i++)
	{
		var c = this.matches[i];
		
		if(c == null)
			continue;
        if (match != c)
    		if((match.index >= c.index) && ((match.index + match.length) <= (c.index + c.length)))
	    		return true;
	}
	
	return false;
}

dp.sh.Highlighter.prototype.ProcessRegexList = function()
{
	for(var i = 0; i < this.regexList.length; i++)
		this.GetMatches(this.regexList[i].regex, this.regexList[i].css);
}

dp.sh.Highlighter.prototype.ProcessSmartTabs = function(code)
{
	var lines	= code.split('\n');
	var result	= '';
	var tabSize	= 4;
	var tab		= '\t';

	// This function inserts specified amount of spaces in the string
	// where a tab is while removing that given tab. 
	function InsertSpaces(line, pos, count)
	{
		var left	= line.substr(0, pos);
		var right	= line.substr(pos + 1, line.length);	// pos + 1 will get rid of the tab
		var spaces	= '';
		
		for(var i = 0; i < count; i++)
			spaces += ' ';
		
		return left + spaces + right;
	}

	// This function process one line for 'smart tabs'
	function ProcessLine(line, tabSize)
	{
		if(line.indexOf(tab) == -1)
			return line;

		var pos = 0;

		while((pos = line.indexOf(tab)) != -1)
		{
			// This is pretty much all there is to the 'smart tabs' logic.
			// Based on the position within the line and size of a tab, 
			// calculate the amount of spaces we need to insert.
			var spaces = tabSize - pos % tabSize;
			
			line = InsertSpaces(line, pos, spaces);
		}
		
		return line;
	}

	// Go through all the lines and do the 'smart tabs' magic.
	for(var i = 0; i < lines.length; i++)
		result += ProcessLine(lines[i], tabSize) + '\n';
	
	return result;
}

dp.sh.Highlighter.prototype.SwitchToList = function()
{
	// thanks to Lachlan Donald from SitePoint.com for this <br/> tag fix.
	var html = this.div.innerHTML.replace(/<(br)\/?>/gi, '\n');
	var lines = html.split('\n');
	
	if(this.addControls == true)
		this.bar.appendChild(dp.sh.Toolbar.Create(this));

	// add columns ruler
	if(this.showColumns)
	{
		var div = this.CreateElement('div');
		var columns = this.CreateElement('div');
		var showEvery = 10;
		var i = 1;
		
		while(i <= 150)
		{
			if(i % showEvery == 0)
			{
				div.innerHTML += i;
				i += (i + '').length;
			}
			else
			{
				div.innerHTML += '&middot;';
				i++;
			}
		}
		
		columns.className = 'columns';
		columns.appendChild(div);
		this.bar.appendChild(columns);
	}

	for(var i = 0, lineIndex = this.firstLine; i < lines.length - 1; i++, lineIndex++)
	{
		var li = this.CreateElement('LI');
		var span = this.CreateElement('SPAN');
		
		// uses .line1 and .line2 css styles for alternating lines
		li.className = (i % 2 == 0) ? 'alt' : '';
		span.innerHTML = lines[i] + '&nbsp;';

		li.appendChild(span);
		this.ol.appendChild(li);
	}
	
	this.div.innerHTML	= '';
}

dp.sh.Highlighter.prototype.Highlight = function(code)
{
	function Trim(str)
	{
		return str.replace(/^\s*(.*?)[\s\n]*$/g, '$1');
	}
	
	function Chop(str)
	{
		return str.replace(/\n*$/, '').replace(/^\n*/, '');
	}

	function Unindent(str)
	{
		var lines = dp.sh.Utils.FixForBlogger(str).split('\n');
		var indents = new Array();
		var regex = /^\s*/g; //new RegExp('^\\s*', 'g');
		var min = 1000;

		// go through every line and check for common number of indents
		for(var i = 0; i < lines.length && min > 0; i++)
		{
			if(Trim(lines[i]).length == 0)
				continue;
				
			var matches = regex.exec(lines[i]);

			if(matches != null && matches.length > 0)
				min = Math.min(matches[0].length, min);
		}

		// trim minimum common number of white space from the begining of every line
		if(min > 0)
			for(var i = 0; i < lines.length; i++)
				lines[i] = lines[i].substr(min);

		return lines.join('\n');
	}
	
	// This function returns a portions of the string from pos1 to pos2 inclusive
	function Copy(string, pos1, pos2)
	{
		return string.substr(pos1, pos2 - pos1);
	}

	var pos	= 0;
	
	if(code == null)
		code = '';
	
	this.originalCode = code;
	this.code = Chop(Unindent(code));
	this.div = this.CreateElement('DIV');
	this.bar = this.CreateElement('DIV');
	this.ol = this.CreateElement('OL');
	this.matches = new Array();

	this.div.className = 'dp-highlighter';
	this.div.highlighter = this;
	
	this.bar.className = 'bar';
	
	// set the first line
	this.ol.start = this.firstLine;

	if(this.CssClass != null)
		this.ol.className = this.CssClass;

	if(this.collapse)
		this.div.className += ' collapsed';
	
	if(this.noGutter)
		this.div.className += ' nogutter';

	// replace tabs with spaces
	if(this.tabsToSpaces == true)
		this.code = this.ProcessSmartTabs(this.code);

	this.ProcessRegexList();	

	// if no matches found, add entire code as plain text
	
	if(this.matches.length == 0)
	{
		this.AddBit(this.code, null);
		this.SwitchToList();
		this.div.appendChild(this.bar);
		this.div.appendChild(this.ol);
		return;
	} 

	// sort the matches
	this.matches = this.matches.sort(dp.sh.Highlighter.SortCallback);

	// The following loop checks to see if any of the matches are inside
	// of other matches. This process would get rid of highligted strings
	// inside comments, keywords inside strings and so on.
	for(var i = 0; i < this.matches.length; i++)
		if(this.IsInside(this.matches[i]))
			this.matches[i] = null;

	// Finally, go through the final list of matches and pull the all
	// together adding everything in between that isn't a match.
	for(var i = 0; i < this.matches.length; i++)
	{
		var match = this.matches[i];

		if(match == null || match.length == 0)
			continue;

		this.AddBit(Copy(this.code, pos, match.index), null);
		this.AddBit(match.value, match.css);

		pos = match.index + match.length;
	}
	
	this.AddBit(this.code.substr(pos), null);

	this.SwitchToList();
	this.div.appendChild(this.bar);
	this.div.appendChild(this.ol);
}

dp.sh.Highlighter.prototype.GetKeywords = function(str) 
{
	return '\\b' + str.replace(/ /g, '\\b|\\b') + '\\b';
}

dp.sh.BloggerMode = function()
{
	dp.sh.isBloggerMode = true;
}

// highlightes all elements identified by name and gets source code from specified property
dp.sh.HighlightAll = function(name, showGutter /* optional */, showControls /* optional */, collapseAll /* optional */, firstLine /* optional */, showColumns /* optional */)
{
	function FindValue()
	{
		var a = arguments;
		
		for(var i = 0; i < a.length; i++)
		{
			if(a[i] == null)
				continue;
				
			if(typeof(a[i]) == 'string' && a[i] != '')
				return a[i] + '';
		
			if(typeof(a[i]) == 'object' && a[i].value != '')
				return a[i].value + '';
		}
		
		return null;
	}
	
	function IsOptionSet(value, list)
	{
		for(var i = 0; i < list.length; i++)
			if(list[i] == value)
				return true;
		
		return false;
	}
	
	function GetOptionValue(name, list, defaultValue)
	{
		var regex = new RegExp('^' + name + '\\[(\\w+)\\]$', 'gi');
		var matches = null;

		for(var i = 0; i < list.length; i++)
			if((matches = regex.exec(list[i])) != null)
				return matches[1];
		
		return defaultValue;
	}
	
	function FindTagsByName(list, name, tagName)
	{
		var tags = document.getElementsByTagName(tagName);

		for(var i = 0; i < tags.length; i++)
			if(tags[i].getAttribute('name') == name)
				list.push(tags[i]);
	}

	var elements = [];
	var highlighter = null;
	var registered = {};
	var propertyName = 'innerHTML';

	// for some reason IE doesn't find <pre/> by name, however it does see them just fine by tag name... 
	FindTagsByName(elements, name, 'pre');
	FindTagsByName(elements, name, 'textarea');

	if(elements.length == 0)
		return;

	// register all brushes
	for(var brush in dp.sh.Brushes)
	{
		var aliases = dp.sh.Brushes[brush].Aliases;

		if(aliases == null)
			continue;
		
		for(var i = 0; i < aliases.length; i++)
			registered[aliases[i]] = brush;
	}

	for(var i = 0; i < elements.length; i++)
	{
		var element = elements[i];
		var options = FindValue(
				element.attributes['class'], element.className, 
				element.attributes['language'], element.language
				);
		var language = '';
		
		if(options == null)
			continue;
		
		options = options.split(':');
		
		language = options[0].toLowerCase();

		if(registered[language] == null)
			continue;
		
		// instantiate a brush
		highlighter = new dp.sh.Brushes[registered[language]]();
		
		// hide the original element
		element.style.display = 'none';

		highlighter.noGutter = (showGutter == null) ? !IsOptionSet('gutter', options) : !showGutter;
		highlighter.addControls = (showControls == null) ? IsOptionSet('controls', options) : showControls;
		highlighter.collapse = (collapseAll == null) ? IsOptionSet('collapse', options) : collapseAll;
		highlighter.showColumns = (showColumns == null) ? IsOptionSet('showcolumns', options) : showColumns;

		// write out custom brush style
		var headNode = document.getElementsByTagName('head')[0];
		if(highlighter.Style && headNode)
		{
			var styleNode = document.createElement('style');
			styleNode.setAttribute('type', 'text/css');

			if(styleNode.styleSheet) // for IE
			{
				styleNode.styleSheet.cssText = highlighter.Style;
			}
			else // for everyone else
			{
				var textNode = document.createTextNode(highlighter.Style);
				styleNode.appendChild(textNode);
			}

			headNode.appendChild(styleNode);
		}
		
		// first line idea comes from Andrew Collington, thanks!
		highlighter.firstLine = (firstLine == null) ? parseInt(GetOptionValue('firstline', options, 1)) : firstLine;

		highlighter.Highlight(element[propertyName]);
		
		highlighter.source = element;

		element.parentNode.insertBefore(highlighter.div, element);
	}	
}

/**
 * Code Syntax Highlighter Plugin for TiddlyWiki.
 * Version 1.1.3 (SyntaxHighLighter: 1.5.1, TiddlyWiki: 2.4.1)
 * Copyright (C) 2008 andot.
 * http://www.coolcode.cn/show-310-1.html
 * 
 * This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General 
 * Public License as published by the Free Software Foundation; either version 2.1 of the License, or (at your option) 
 * any later version.
 *
 * This library is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied 
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more 
 * details.
 *
 * You should have received a copy of the GNU Lesser General Public License along with this library; if not, write to 
 * the Free Software Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA 
 */
version.extensions.SyntaxHighLighterPlugin= {major: 1, minor: 1, revision: 3, date: new Date(2008,10,24)};

dp.sh.ClipboardSwf = 'clipboard.swf';

dp.sh.Highlight = function (element, options, showGutter /* optional */, showControls /* optional */, collapseAll /* optional */, firstLine /* optional */, showColumns /* optional */) {
    function FindValue()
    {
        var a = arguments;
        
        for(var i = 0; i < a.length; i++)
        {
            if(a[i] == null)
                continue;
                
            if(typeof(a[i]) == 'string' && a[i] != '')
                return a[i] + '';
        
            if(typeof(a[i]) == 'object' && a[i].value != '')
                return a[i].value + '';
        }
        
        return null;
    }

    function IsOptionSet(value, list)
    {
        for(var i = 0; i < list.length; i++)
            if(list[i] == value)
                return true;
        
        return false;
    }
    
    function GetOptionValue(name, list, defaultValue)
    {
        var regex = new RegExp('^' + name + '\\[(\\w+)\\]$', 'gi');
        var matches = null;

        for(var i = 0; i < list.length; i++)
            if((matches = regex.exec(list[i])) != null)
                return matches[1];
        
        return defaultValue;
    }
	var highlighter = null;
	var propertyName = 'innerHTML';

    if(this.registered == undefined) {
        var registered = {};
    	// register all brushes
	    for(var brush in dp.sh.Brushes)
	    {
		    var aliases = dp.sh.Brushes[brush].Aliases;

		    if(aliases == null)
			    continue;
		
		    for(var i = 0; i < aliases.length; i++)
			    registered[aliases[i]] = brush;
	    }
        this.registered = registered;
    }

    options = options.split(':');
    
    language = options[0].toLowerCase();

    if(this.registered[language] == null) return;
    
    // instantiate a brush
    highlighter = new dp.sh.Brushes[this.registered[language]]();
    
    // hide the original element
    element.style.display = 'none';

    highlighter.noGutter = (showGutter == null) ? !IsOptionSet('gutter', options) : !showGutter;
    highlighter.addControls = (showControls == null) ? IsOptionSet('controls', options) : showControls;
    highlighter.collapse = (collapseAll == null) ? IsOptionSet('collapse', options) : collapseAll;
    highlighter.showColumns = (showColumns == null) ? IsOptionSet('showcolumns', options) : showColumns;

    // write out custom brush style
    var headNode = document.getElementsByTagName('head')[0];
    var styleNode = document.getElementById(highlighter.CssClass);
    if(highlighter.Style && headNode && !styleNode)
    {
        var styleNode = document.createElement('style');
        styleNode.setAttribute('id', highlighter.CssClass);
        styleNode.setAttribute('type', 'text/css');

        if(styleNode.styleSheet) // for IE
        {
            styleNode.styleSheet.cssText = highlighter.Style;
        }
        else // for everyone else
        {
            var textNode = document.createTextNode(highlighter.Style);
            styleNode.appendChild(textNode);
        }

        headNode.appendChild(styleNode);
    }
    
    // first line idea comes from Andrew Collington, thanks!
    highlighter.firstLine = (firstLine == null) ? parseInt(GetOptionValue('firstline', options, 1)) : firstLine;

    highlighter.Highlight(element[propertyName]);
    
    highlighter.source = element;

    element.parentNode.insertBefore(highlighter.div, element);
}

config.formatters.push({
	name: "SyntaxHighlighter",
	match: "^<code[\\s]+[^>]+>\\n",
	element: "pre",
	handler: function(w)
	{
        this.lookaheadRegExp = /<code[\s]+([^>]+)>\n((?:^[^\n]*\n)+?)(^<\/code>$\n?)/mg;
		this.lookaheadRegExp.lastIndex = w.matchStart;
		var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
		if(lookaheadMatch && lookaheadMatch.index == w.matchStart) {
            var options = lookaheadMatch[1];
			var text = lookaheadMatch[2];
			if(config.browser.isIE)
				text = text.replace(/\n/g,"\r");
			var element = createTiddlyElement(w.output,this.element,null,null,text);
            dp.sh.Highlight(element, options);
			w.nextMatch = lookaheadMatch.index + lookaheadMatch[0].length;
		}
	}
});

config.formatterHelpers.enclosedTextHelper = function(w) {
	this.lookaheadRegExp.lastIndex = w.matchStart;
	var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
	if(lookaheadMatch && lookaheadMatch.index == w.matchStart) {
		var text = lookaheadMatch[1];
		if(config.browser.isIE)
			text = text.replace(/\n/g,"\r");
		var element = createTiddlyElement(w.output,this.element,null,null,text);
		
		//switch(w.matchText) {
		//case "/*{{{*/\n": // CSS
		/*	dp.sh.Highlight(element, 'css');
			break;
		case "//{{{\n": // plugin
			dp.sh.Highlight(element, 'js');
			break;
		case "<!--{{{-->\n": //template
			dp.sh.Highlight(element, 'xml');
			break;
		}*/
		w.nextMatch = lookaheadMatch.index + lookaheadMatch[0].length;
	}
}

/*
 * AS3 Syntax
 * @author Mark Walters
 * http://www.digitalflipbook.com
*/

dp.sh.Brushes.AS3 = function()
{
	var definitions =	'class interface package';
	
	var keywords =	'Array Boolean Date decodeURI decodeURIComponent encodeURI encodeURIComponent escape ' +
					'int isFinite isNaN isXMLName Number Object parseFloat parseInt ' +
					'String trace uint unescape XML XMLList ' + //global functions
					
					'Infinity -Infinity NaN undefined ' + //global constants
					
					'as delete instanceof is new typeof ' + //operators
					
					'break case catch continue default do each else finally for if in ' +
					'label return super switch throw try while with ' + //statements
					
					'dynamic final internal native override private protected public static ' + //attributes
					
					'...rest const extends function get implements namespace set ' + //definitions
					
					'import include use ' + //directives
					
					'AS3 flash_proxy object_proxy ' + //namespaces
					
					'false null this true ' + //expressions
					
					'void Null'; //types
	
	this.regexList = [
		{ regex: dp.sh.RegexLib.SingleLineCComments,				css: 'comment' },			// one line comments
		{ regex: dp.sh.RegexLib.MultiLineCComments,					css: 'blockcomment' },		// multiline comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString,					css: 'string' },			// double quoted strings
		{ regex: dp.sh.RegexLib.SingleQuotedString,					css: 'string' },			// single quoted strings
		{ regex: new RegExp('^\\s*#.*', 'gm'),						css: 'preprocessor' },		// preprocessor tags like #region and #endregion
		{ regex: new RegExp(this.GetKeywords(definitions), 'gm'),	css: 'definition' },		// definitions
		{ regex: new RegExp(this.GetKeywords(keywords), 'gm'),		css: 'keyword' },			// keywords
		{ regex: new RegExp('var', 'gm'),							css: 'variable' }			// variable
		];

	this.CssClass = 'dp-as';
	this.Style =	'.dp-as .comment { color: #009900; font-style: italic; }' +
					'.dp-as .blockcomment { color: #3f5fbf; }' +
					'.dp-as .string { color: #990000; }' +
					'.dp-as .preprocessor { color: #0033ff; }' +
					'.dp-as .definition { color: #9900cc; font-weight: bold; }' +
					'.dp-as .keyword { color: #0033ff; }' +
					'.dp-as .variable { color: #6699cc; font-weight: bold; }';
}

dp.sh.Brushes.AS3.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.AS3.Aliases	= ['as', 'actionscript', 'ActionScript', 'as3', 'AS3'];

/**
 *  Author: Sa�l Mart�nez Vidals
 *  http://buglog-saul.blogspot.com/
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, version 3 of the License.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

dp.sh.Brushes.Bash = function()
{
    var builtins =  'alias bg bind break builtin cd command compgen complete continue ' +
                    'declare dirs disown echo enable eval exec exit export fc fg ' +
                    'getopts hash help history jobs kill let local logout popd printf ' +
                    'pushd pwd read readonly return set shift shopt source ' +
                    'suspend test times trap type typeset ulimit umask unalias unset wait';

    var keywords =  'case do done elif else esac fi for function if in select then ' +
                    'time until while';

    this.regexList = [
                    /* cometarios */
                    {regex: dp.sh.RegexLib.SingleLinePerlComments, css: 'comment'},
                    /* cadenas de texto */
                    {regex: dp.sh.RegexLib.DoubleQuotedString, css: 'string'},
                    {regex: dp.sh.RegexLib.SingleQuotedString, css: 'string'},
                    /* delimitadores */
                    {regex: new RegExp('[()[\\]{}]', 'g'), css: 'delim'},
                    /* variables */
                    {regex: new RegExp('\\$\\w+', 'g'), css: 'vars'},
                    {regex: new RegExp('\\w+=', 'g'), css: 'vars'},
                    /* banderas */
                    {regex: new RegExp('\\s-\\w+', 'g'), css: 'flag'},
                    /* builtins */
                    {regex: new RegExp(this.GetKeywords(builtins), 'gm'), css: 'builtin'},
                    /* palabras reservadas */
                    {regex: new RegExp(this.GetKeywords(keywords), 'gm'), css: 'keyword'}
                    ];

    this.CssClass = 'dp-bash';

    this.Style =    '.dp-bash .builtin {color: maroon; font-weight: bold;}' +
                    '.dp-bash .comment {color: gray;}' +
                    '.dp-bash .delim {font-weight: bold;}' +
                    '.dp-bash .flag {color: green;}' +
                    '.dp-bash .string {color: red;}' +
                    '.dp-bash .vars {color: blue;}';

}

dp.sh.Brushes.Bash.prototype = new dp.sh.Highlighter();
dp.sh.Brushes.Bash.Aliases = ['bash', 'sh'];

dp.sh.Brushes.Batch = function()
{
    var builtins =  'APPEND ATTRIB CD CHDIR CHKDSK CHOICE CLS COPY DEL ERASE DELTREE ' +
                    'DIR EXIT FC COMP FDISK FIND FORMAT FSUTIL HELP JOIN ' +
                    'LABEL LOADFIX MK MKDIR MEM MEMMAKER MORE MOVE MSD PCPARK ' +
                    'PRINT RD RMDIR REN SCANDISK SHARE SORT SUBST SYS ' +
                    'TIME DATE TREE TRUENAME TYPE UNDELETE VER XCOPY';

    var keywords =  'DO ELSE FOR IN CALL CHOICE GOTO SHIFT PAUSE ERRORLEVEL ' +
      'IF NOT EXIST LFNFOR START SETLOCAL ENDLOCAL ECHO SET';

    this.regexList = [
 {regex: new RegExp('REM.*$', 'gm'), css: 'comment'},
 {regex: new RegExp('::.*$', 'gm'), css: 'comment'},
 {regex: dp.sh.RegexLib.DoubleQuotedString, css: 'string'},
 {regex: dp.sh.RegexLib.SingleQuotedString, css: 'string'},
 {regex: new RegExp('[()[\\]{}]', 'g'), css: 'delim'},
 {regex: new RegExp('%\\w+%', 'g'), css: 'vars'},
 {regex: new RegExp('%%\\w+', 'g'), css: 'vars'},
 {regex: new RegExp('\\w+=', 'g'), css: 'vars'},
 {regex: new RegExp('@\\w+', 'g'), css: 'keyword'},
 {regex: new RegExp(':\\w+', 'g'), css: 'keyword'},
 {regex: new RegExp('\\s/\\w+', 'g'), css: 'flag'},
 {regex: new RegExp(this.GetKeywords(builtins), 'gm'), css: 'builtin'},
 {regex: new RegExp(this.GetKeywords(keywords), 'gm'), css: 'keyword'}
 ];

    this.CssClass = 'dp-batch';

    this.Style =    '.dp-batch .builtin {color: maroon; font-weight: bold;}' +
                    '.dp-batch .comment {color: gray;}' +
                    '.dp-batch .delim {font-weight: bold;}' +
                    '.dp-batch .flag {color: green;}' +
                    '.dp-batch .string {color: red;}' +
                    '.dp-batch .vars {color: blue;font-weight: bold;}';

}

dp.sh.Brushes.Batch.prototype = new dp.sh.Highlighter();
dp.sh.Brushes.Batch.Aliases = ['batch', 'dos'];

dp.sh.Brushes.ColdFusion = function()
{
	this.CssClass		=	'dp-coldfusion';
	this.Style			=	'.dp-coldfusion { font: 13px "Courier New", Courier, monospace; }' +
							'.dp-coldfusion .tag, .dp-coldfusion .tag-name { color: #990033; }' +
							'.dp-coldfusion .attribute { color: #990033; }' +
							'.dp-coldfusion .attribute-value { color: #0000FF; }' +
							'.dp-coldfusion .cfcomments { background-color: #FFFF99; color: #000000; }' +
							'.dp-coldfusion .cfscriptcomments { color: #999999; }' +
							'.dp-coldfusion .keywords { color: #0000FF; }' +
							'.dp-coldfusion .mgkeywords { color: #CC9900; }' +
							'.dp-coldfusion .numbers { color: #ff0000; }' +
							'.dp-coldfusion .strings { color: green; }';

	this.mgKeywords		=	'setvalue getvalue addresult viewcollection viewstate';

	this.keywords		=	'var eq neq gt gte lt lte not and or true false ' +
							'abs acos addsoaprequestheader addsoapresponseheader ' +
							'arrayappend arrayavg arrayclear arraydeleteat arrayinsertat ' +
							'arrayisempty arraylen arraymax arraymin arraynew ' +
							'arrayprepend arrayresize arrayset arraysort arraysum ' +
							'arrayswap arraytolist asc asin atn binarydecode binaryencode ' +
							'bitand bitmaskclear bitmaskread bitmaskset bitnot bitor bitshln ' +
							'bitshrn bitxor ceiling charsetdecode charsetencode chr cjustify ' +
							'compare comparenocase cos createdate createdatetime createobject ' +
							'createobject createobject createobject createobject createodbcdate ' +
							'createodbcdatetime createodbctime createtime createtimespan ' +
							'createuuid dateadd datecompare dateconvert datediff dateformat ' +
							'datepart day dayofweek dayofweekasstring dayofyear daysinmonth ' +
							'daysinyear de decimalformat decrementvalue decrypt decryptbinary ' +
							'deleteclientvariable directoryexists dollarformat duplicate encrypt ' +
							'encryptbinary evaluate exp expandpath fileexists find findnocase ' +
							'findoneof firstdayofmonth fix formatbasen generatesecretkey ' +
							'getauthuser getbasetagdata getbasetaglist getbasetemplatepath ' +
							'getclientvariableslist getcontextroot getcurrenttemplatepath ' +
							'getdirectoryfrompath getencoding getexception getfilefrompath ' +
							'getfunctionlist getgatewayhelper gethttprequestdata gethttptimestring ' +
							'getk2serverdoccount getk2serverdoccountlimit getlocale ' +
							'getlocaledisplayname getlocalhostip getmetadata getmetricdata ' +
							'getpagecontext getprofilesections getprofilestring getsoaprequest ' +
							'getsoaprequestheader getsoapresponse getsoapresponseheader ' +
							'gettempdirectory gettempfile gettemplatepath gettickcount ' +
							'gettimezoneinfo gettoken hash hour htmlcodeformat htmleditformat ' +
							'iif incrementvalue inputbasen insert int isarray isbinary isboolean ' +
							'iscustomfunction isdate isdebugmode isdefined isk2serverabroker ' +
							'isk2serverdoccountexceeded isk2serveronline isleapyear islocalhost ' +
							'isnumeric isnumericdate isobject isquery issimplevalue issoaprequest ' +
							'isstruct isuserinrole isvalid isvalid isvalid iswddx isxml ' +
							'isxmlattribute isxmldoc isxmlelem isxmlnode isxmlroot javacast ' +
							'jsstringformat lcase left len listappend listchangedelims listcontains ' +
							'listcontainsnocase listdeleteat listfind listfindnocase listfirst ' +
							'listgetat listinsertat listlast listlen listprepend listqualify ' +
							'listrest listsetat listsort listtoarray listvaluecount ' +
							'listvaluecountnocase ljustify log log10 lscurrencyformat lsdateformat ' +
							'lseurocurrencyformat lsiscurrency lsisdate lsisnumeric lsnumberformat ' +
							'lsparsecurrency lsparsedatetime lsparseeurocurrency lsparsenumber ' +
							'lstimeformat ltrim max mid min minute month monthasstring now ' +
							'numberformat paragraphformat parameterexists parsedatetime pi ' +
							'preservesinglequotes quarter queryaddcolumn queryaddrow querynew ' +
							'querysetcell quotedvaluelist rand randomize randrange refind ' +
							'refindnocase releasecomobject removechars repeatstring replace ' +
							'replacelist replacenocase rereplace rereplacenocase reverse right ' +
							'rjustify round rtrim second sendgatewaymessage setencoding ' +
							'setlocale setprofilestring setvariable sgn sin spanexcluding ' +
							'spanincluding sqr stripcr structappend structclear structcopy ' +
							'structcount structdelete structfind structfindkey structfindvalue ' +
							'structget structinsert structisempty structkeyarray structkeyexists ' +
							'structkeylist structnew structsort structupdate tan timeformat ' +
							'tobase64 tobinary toscript tostring trim ucase urldecode urlencodedformat ' +
							'urlsessionformat val valuelist week wrap writeoutput xmlchildpos ' +
							'xmlelemnew xmlformat xmlgetnodetype xmlnew xmlparse xmlsearch xmltransform ' +
							'xmlvalidate year yesnoformat';

	// Array to hold the possible string matches
	this.stringMatches	=	new Array();
	this.attributeMatches	=	new Array();
}

dp.sh.Brushes.ColdFusion.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.ColdFusion.Aliases	= ['coldfusion', 'cf'];

dp.sh.Brushes.ColdFusion.prototype.ProcessRegexList = function()
{
	function push(array, value)
	{
		array[array.length] = value;
	}

	function find(array, element)
	{
		for(var i = 0; i < array.length; i++){
			if(array[i] == element){
				return i;
			}
		}

		return -1;
	}

	var match	= null;
	var regex	= null;

	// Match numbers
	// (\\d+)
	this.GetMatches(new RegExp('\\b(\\d+)', 'gm'), 'numbers');

	// Match mg keywords
	this.GetMatches(new RegExp(this.GetKeywords(this.mgKeywords), 'igm'), 'mgkeywords');

	// Match single line comments via the built in single line regex (for cfscript)
	this.GetMatches(dp.sh.RegexLib.SingleLineCComments, 'cfscriptcomments');

	// Match multi line comments via the built in multi line regex (for cfscript)
	this.GetMatches(dp.sh.RegexLib.MultiLineCComments, 'cfscriptcomments');

	// Match tag based comments (including multiline comments)
	// (\&lt;|<)!---[\\s\\S]*?---(\&gt;|>)
	this.GetMatches(new RegExp('(\&lt;|<)!---[\\s\\S]*?---(\&gt;|>)', 'gm'), 'cfcomments');

	// Match attributes and their values excluding cfset tags
	// (cfset\\s*)?([:\\w-\.]+)\\s*=\\s*(".*?"|\'.*?\')*
	regex = new RegExp('(cfset\\s*)?([:\\w-\.]+)\\s*=\\s*(".*?"|\'.*?\')*', 'gm');
	while((match = regex.exec(this.code)) != null)
	{
		// If there is match in element 1 (the tag is cfset), continute to the next match
		if (match[1] != undefined && match[1] != '')
		{
			continue;
		}

		// Add the atribute to the matches only if it has a matching value (dbtype="query")
		// and the match is not an empty string
		if (match[3] != undefined && match[3] != '' && match[3] != '""' && match[3] != "''")
		{
			push(this.matches, new dp.sh.Match(match[2], match.index, 'attribute'));
			push(this.matches, new dp.sh.Match(match[3], match.index + match[0].indexOf(match[3]), 'attribute-value'));
			// Add the attribute value to the array of string matches
			push(this.stringMatches, match[3]);

			// Add the attribute to the array of attribute matches
			push(this.attributeMatches, match[2]);
		}
	}

	// Match opening and closing tag brackets
	// (\&lt;|<)/*\?*(?!\!)|/*\?*(\&gt;|>)
	this.GetMatches(new RegExp('(\&lt;|<)/*\\?*(?!\\!)|/*\\?*(\&gt;|>)', 'gm'), 'tag');

	// Match tag names
	// (\&lt;|<)/*\?*\s*(\w+)
	regex = new RegExp('(?:\&lt;|<)/*\\?*\\s*([:\\w-\.]+)', 'gm');
	while((match = regex.exec(this.code)) != null)
	{
		push(this.matches, new dp.sh.Match(match[1], match.index + match[0].indexOf(match[1]), 'tag-name'));
	}

	// Match keywords
	regex = new RegExp(this.GetKeywords(this.keywords), 'igm');
	while((match = regex.exec(this.code)) != null)
	{
		// if a match exists (there is a value for the attribute)
		if (find(this.attributeMatches, match[0]) == -1)
		{
			push(this.matches, new dp.sh.Match(match[0], match.index, 'keywords'));
		}
	}

	// Match cfset tags and quoated attributes
	regex = new RegExp('cfset\\s*.*(".*?"|\'.*?\')', 'gm');
	while((match = regex.exec(this.code)) != null)
	{
		// if a match exists (there is a value for the attribute)
		if(match[1] != undefined && match[1] != '')
		{
			push(this.matches, new dp.sh.Match(match[1], match.index + match[0].indexOf(match[1]), 'strings'));

			// Add the attribute to the array of string matches
			push(this.stringMatches, match[1]);
		}
	}

	// Match string enclosed in double quoats
	while((match = dp.sh.RegexLib.DoubleQuotedString.exec(this.code)) != null)
	{
		//if (this.stringMatches.indexOf(match[0]) == -1)
		if (find(this.stringMatches, match[0]) == -1)
			push(this.matches, new dp.sh.Match(match[0], match.index, 'strings'));
	}

	// Match string enclosed in single quoats
	while((match = dp.sh.RegexLib.SingleQuotedString.exec(this.code)) != null)
	{
		//if (this.stringMatches.indexOf(match[0]) == -1)
		if (find(this.stringMatches, match[0]) == -1)
			push(this.matches, new dp.sh.Match(match[0], match.index, 'strings'));
	}
}

/**
 * Code Syntax Highlighter for C++(Windows Platform).
 * Version 0.0.2
 * Copyright (C) 2006 Shin, YoungJin.
 * http://www.jiniya.net/lecture/techbox/test.html
 * 
 * This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General 
 * Public License as published by the Free Software Foundation; either version 2.1 of the License, or (at your option) 
 * any later version.
 *
 * This library is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied 
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Lesser General Public License for more 
 * details.
 *
 * You should have received a copy of the GNU Lesser General Public License along with this library; if not, write to 
 * the Free Software Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA 
 */

dp.sh.Brushes.Cpp = function()
{
	var datatypes = 
	'ATOM BOOL BOOLEAN BYTE CHAR COLORREF DWORD DWORDLONG DWORD_PTR ' +
	'DWORD32 DWORD64 FLOAT HACCEL HALF_PTR HANDLE HBITMAP HBRUSH ' + 
	'HCOLORSPACE HCONV HCONVLIST HCURSOR HDC HDDEDATA HDESK HDROP HDWP ' +
	'HENHMETAFILE HFILE HFONT HGDIOBJ HGLOBAL HHOOK HICON HINSTANCE HKEY ' +
	'HKL HLOCAL HMENU HMETAFILE HMODULE HMONITOR HPALETTE HPEN HRESULT ' +
	'HRGN HRSRC HSZ HWINSTA HWND INT INT_PTR INT32 INT64 LANGID LCID LCTYPE ' +
	'LGRPID LONG LONGLONG LONG_PTR LONG32 LONG64 LPARAM LPBOOL LPBYTE LPCOLORREF ' +
	'LPCSTR LPCTSTR LPCVOID LPCWSTR LPDWORD LPHANDLE LPINT LPLONG LPSTR LPTSTR ' +
	'LPVOID LPWORD LPWSTR LRESULT PBOOL PBOOLEAN PBYTE PCHAR PCSTR PCTSTR PCWSTR ' +
	'PDWORDLONG PDWORD_PTR PDWORD32 PDWORD64 PFLOAT PHALF_PTR PHANDLE PHKEY PINT ' +
	'PINT_PTR PINT32 PINT64 PLCID PLONG PLONGLONG PLONG_PTR PLONG32 PLONG64 POINTER_32 ' +
	'POINTER_64 PSHORT PSIZE_T PSSIZE_T PSTR PTBYTE PTCHAR PTSTR PUCHAR PUHALF_PTR ' +
	'PUINT PUINT_PTR PUINT32 PUINT64 PULONG PULONGLONG PULONG_PTR PULONG32 PULONG64 ' +
	'PUSHORT PVOID PWCHAR PWORD PWSTR SC_HANDLE SC_LOCK SERVICE_STATUS_HANDLE SHORT ' + 
	'SIZE_T SSIZE_T TBYTE TCHAR UCHAR UHALF_PTR UINT UINT_PTR UINT32 UINT64 ULONG ' +
	'ULONGLONG ULONG_PTR ULONG32 ULONG64 USHORT USN VOID WCHAR WORD WPARAM WPARAM WPARAM ' +
	'char bool short int __int32 __int64 __int8 __int16 long float double __wchar_t ' +
	'clock_t _complex _dev_t _diskfree_t div_t ldiv_t _exception _EXCEPTION_POINTERS ' +
	'FILE _finddata_t _finddatai64_t _wfinddata_t _wfinddatai64_t __finddata64_t ' +
	'__wfinddata64_t _FPIEEE_RECORD fpos_t _HEAPINFO _HFILE lconv intptr_t ' +
	'jmp_buf mbstate_t _off_t _onexit_t _PNH ptrdiff_t _purecall_handler ' +
	'sig_atomic_t size_t _stat __stat64 _stati64 terminate_function ' +
	'time_t __time64_t _timeb __timeb64 tm uintptr_t _utimbuf ' +
	'va_list wchar_t wctrans_t wctype_t wint_t signed';

	var keywords = 
	'break case catch class const __finally __exception __try ' +
	'const_cast continue private public protected __declspec ' + 
	'default delete deprecated dllexport dllimport do dynamic_cast ' + 
	'else enum explicit extern if for friend goto inline ' + 
	'mutable naked namespace new noinline noreturn nothrow ' + 
	'register reinterpret_cast return selectany ' + 
	'sizeof static static_cast struct switch template this ' + 
	'thread throw true false try typedef typeid typename union ' + 
	'using uuid virtual void volatile whcar_t while';

	this.regexList = [
		{ regex: dp.sh.RegexLib.SingleLineCComments,				css: 'comment' },			// one line comments
		{ regex: dp.sh.RegexLib.MultiLineCComments,					css: 'comment' },			// multiline comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString,					css: 'string' },			// strings
		{ regex: dp.sh.RegexLib.SingleQuotedString,					css: 'string' },			// strings
		{ regex: new RegExp('^ *#.*', 'gm'),						css: 'preprocessor' },
		{ regex: new RegExp(this.GetKeywords(datatypes), 'gm'),		css: 'datatypes' },
		{ regex: new RegExp(this.GetKeywords(keywords), 'gm'),		css: 'keyword' }
		];

	this.CssClass = 'dp-cpp';
	this.Style =	'.dp-cpp .datatypes { color: #2E8B57; font-weight: bold; }';
}

dp.sh.Brushes.Cpp.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.Cpp.Aliases	= ['cpp', 'c', 'c++'];

dp.sh.Brushes.Cys = function () {
    var datatypes = "int int32 int64 fp32 fp64 fp80 double void symbol opaque",
        keywords = "atomic break case catch " + 
             "continue " + 
             "delete do " + 
             "else enum extern if for goto inline " + 
             "new " + 
             "register return " + 
             "sizeof typeof offsetof alloca static switch this " + 
             "thread throw true false try union " + 
             "using virtual while";
    this.regexList = [
    {regex: dp.sh.RegexLib.SingleLineCysComments,   css: "comment"    },
    {regex: dp.sh.RegexLib.MultiLineCysComments,   css: "comment"    },
    {regex: dp.sh.RegexLib.DoubleQuotedString,    css: "string"    },
    {regex: new RegExp("[a-zA-Z]:|[a-zA-Z_][0-9a-zA-Z_]+:", "gm"),    css: "label"    },
    {regex: /[-`~!@#$%^*|+?=\/\\]+/gm,   css: "operatur"    },    
    
//    {regex: new RegExp("[^_][-`~!@#$%^*|+?=/\\\\]+[^_]", "gm"),   css: "operatur"    },
    {regex: new RegExp(this.GetKeywords(datatypes), "gm"),   css: "datatypes"    },
    {regex: new RegExp(this.GetKeywords(keywords), "gm"),    css: "keyword"    }
    ];
    this.CssClass = "dp-cys";
    this.Style = ".dp-cys .datatypes { color: #2E8B57; font-weight: bold; }"
}
dp.sh.Brushes.Cys.prototype = new dp.sh.Highlighter();
dp.sh.Brushes.Cys.Aliases = ["cys", "cystem"];


dp.sh.Brushes.CSharp = function()
{
	var keywords =	'abstract as base bool break byte case catch char checked class const ' +
					'continue decimal default delegate do double else enum event explicit ' +
					'extern false finally fixed float for foreach get goto if implicit in int ' +
					'interface internal is lock long namespace new null object operator out ' +
					'override params private protected public readonly ref return sbyte sealed set ' +
					'short sizeof stackalloc static string struct switch this throw true try ' +
					'typeof uint ulong unchecked unsafe ushort using virtual void while';

	this.regexList = [
		// There's a slight problem with matching single line comments and figuring out
		// a difference between // and ///. Using lookahead and lookbehind solves the
		// problem, unfortunately JavaScript doesn't support lookbehind. So I'm at a 
		// loss how to translate that regular expression to JavaScript compatible one.
//		{ regex: new RegExp('(?<!/)//(?!/).*$|(?<!/)////(?!/).*$|/\\*[^\\*]*(.)*?\\*/', 'gm'),	css: 'comment' },			// one line comments starting with anything BUT '///' and multiline comments
//		{ regex: new RegExp('(?<!/)///(?!/).*$', 'gm'),											css: 'comments' },		// XML comments starting with ///

		{ regex: dp.sh.RegexLib.SingleLineCComments,				css: 'comment' },			// one line comments
		{ regex: dp.sh.RegexLib.MultiLineCComments,					css: 'comment' },			// multiline comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString,					css: 'string' },			// strings
		{ regex: dp.sh.RegexLib.SingleQuotedString,					css: 'string' },			// strings
		{ regex: new RegExp('^\\s*#.*', 'gm'),						css: 'preprocessor' },		// preprocessor tags like #region and #endregion
		{ regex: new RegExp(this.GetKeywords(keywords), 'gm'),		css: 'keyword' }			// c# keyword
		];

	this.CssClass = 'dp-c';
	this.Style = '.dp-c .vars { color: #d00; }';
}

dp.sh.Brushes.CSharp.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.CSharp.Aliases	= ['c#', 'c-sharp', 'csharp'];

dp.sh.Brushes.CSS = function()
{
	var keywords =	'ascent azimuth background-attachment background-color background-image background-position ' +
					'background-repeat background baseline bbox border-collapse border-color border-spacing border-style border-top ' +
					'border-right border-bottom border-left border-top-color border-right-color border-bottom-color border-left-color ' +
					'border-top-style border-right-style border-bottom-style border-left-style border-top-width border-right-width ' +
					'border-bottom-width border-left-width border-width border cap-height caption-side centerline clear clip color ' +
					'content counter-increment counter-reset cue-after cue-before cue cursor definition-src descent direction display ' +
					'elevation empty-cells float font-size-adjust font-family font-size font-stretch font-style font-variant font-weight font ' +
					'height letter-spacing line-height list-style-image list-style-position list-style-type list-style margin-top ' +
					'margin-right margin-bottom margin-left margin marker-offset marks mathline max-height max-width min-height min-width orphans ' +
					'outline-color outline-style outline-width outline overflow padding-top padding-right padding-bottom padding-left padding page ' +
					'page-break-after page-break-before page-break-inside pause pause-after pause-before pitch pitch-range play-during position ' +
					'quotes richness size slope src speak-header speak-numeral speak-punctuation speak speech-rate stemh stemv stress ' +
					'table-layout text-align text-decoration text-indent text-shadow text-transform unicode-bidi unicode-range units-per-em ' +
					'vertical-align visibility voice-family volume white-space widows width widths word-spacing x-height z-index';

	var values =	'above absolute all always aqua armenian attr aural auto avoid baseline behind below bidi-override black blink block blue bold bolder '+
					'both bottom braille capitalize caption center center-left center-right circle close-quote code collapse compact condensed '+
					'continuous counter counters crop cross crosshair cursive dashed decimal decimal-leading-zero default digits disc dotted double '+
					'embed embossed e-resize expanded extra-condensed extra-expanded fantasy far-left far-right fast faster fixed format fuchsia '+
					'gray green groove handheld hebrew help hidden hide high higher icon inline-table inline inset inside invert italic '+
					'justify landscape large larger left-side left leftwards level lighter lime line-through list-item local loud lower-alpha '+
					'lowercase lower-greek lower-latin lower-roman lower low ltr marker maroon medium message-box middle mix move narrower '+
					'navy ne-resize no-close-quote none no-open-quote no-repeat normal nowrap n-resize nw-resize oblique olive once open-quote outset '+
					'outside overline pointer portrait pre print projection purple red relative repeat repeat-x repeat-y rgb ridge right right-side '+
					'rightwards rtl run-in screen scroll semi-condensed semi-expanded separate se-resize show silent silver slower slow '+
					'small small-caps small-caption smaller soft solid speech spell-out square s-resize static status-bar sub super sw-resize '+
					'table-caption table-cell table-column table-column-group table-footer-group table-header-group table-row table-row-group teal '+
					'text-bottom text-top thick thin top transparent tty tv ultra-condensed ultra-expanded underline upper-alpha uppercase upper-latin '+
					'upper-roman url visible wait white wider w-resize x-fast x-high x-large x-loud x-low x-slow x-small x-soft xx-large xx-small yellow';
	
	var fonts =		'[mM]onospace [tT]ahoma [vV]erdana [aA]rial [hH]elvetica [sS]ans-serif [sS]erif';

	this.regexList = [
		{ regex: dp.sh.RegexLib.MultiLineCComments,						css: 'comment' },	// multiline comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString,						css: 'string' },	// double quoted strings
		{ regex: dp.sh.RegexLib.SingleQuotedString,						css: 'string' },	// single quoted strings
		{ regex: new RegExp('\\#[a-zA-Z0-9]{3,6}', 'g'),				css: 'value' },		// html colors
		{ regex: new RegExp('(-?\\d+)(\.\\d+)?(px|em|pt|\:|\%|)', 'g'),	css: 'value' },		// sizes
		{ regex: new RegExp('!important', 'g'),							css: 'important' },	// !important
		{ regex: new RegExp(this.GetKeywordsCSS(keywords), 'gm'),		css: 'keyword' },	// keywords
		{ regex: new RegExp(this.GetValuesCSS(values), 'g'),			css: 'value' },		// values
		{ regex: new RegExp(this.GetValuesCSS(fonts), 'g'),				css: 'value' }		// fonts
		];

	this.CssClass = 'dp-css';
	this.Style =	'.dp-css .value { color: black; }' +
					'.dp-css .important { color: red; }'
					;
}

dp.sh.Highlighter.prototype.GetKeywordsCSS = function(str)
{
	return '\\b([a-z_]|)' + str.replace(/ /g, '(?=:)\\b|\\b([a-z_\\*]|\\*|)') + '(?=:)\\b';
}

dp.sh.Highlighter.prototype.GetValuesCSS = function(str)
{
	return '\\b' + str.replace(/ /g, '(?!-)(?!:)\\b|\\b()') + '\:\\b';
}

dp.sh.Brushes.CSS.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.CSS.Aliases	= ['css'];

/* Delphi brush is contributed by Eddie Shipman */
dp.sh.Brushes.Delphi = function()
{
	var keywords =	'abs addr and ansichar ansistring array as asm begin boolean byte cardinal ' +
					'case char class comp const constructor currency destructor div do double ' +
					'downto else end except exports extended false file finalization finally ' +
					'for function goto if implementation in inherited int64 initialization ' +
					'integer interface is label library longint longword mod nil not object ' +
					'of on or packed pansichar pansistring pchar pcurrency pdatetime pextended ' + 
					'pint64 pointer private procedure program property pshortstring pstring ' + 
					'pvariant pwidechar pwidestring protected public published raise real real48 ' +
					'record repeat set shl shortint shortstring shr single smallint string then ' +
					'threadvar to true try type unit until uses val var varirnt while widechar ' +
					'widestring with word write writeln xor';

	this.regexList = [
		{ regex: new RegExp('\\(\\*[\\s\\S]*?\\*\\)', 'gm'),		css: 'comment' },  			// multiline comments (* *)
		{ regex: new RegExp('{(?!\\$)[\\s\\S]*?}', 'gm'),			css: 'comment' },  			// multiline comments { }
		{ regex: dp.sh.RegexLib.SingleLineCComments,				css: 'comment' },  			// one line
		{ regex: dp.sh.RegexLib.SingleQuotedString,					css: 'string' },			// strings
		{ regex: new RegExp('\\{\\$[a-zA-Z]+ .+\\}', 'g'),			css: 'directive' },			// Compiler Directives and Region tags
		{ regex: new RegExp('\\b[\\d\\.]+\\b', 'g'),				css: 'number' },			// numbers 12345
		{ regex: new RegExp('\\$[a-zA-Z0-9]+\\b', 'g'),				css: 'number' },			// numbers $F5D3
		{ regex: new RegExp(this.GetKeywords(keywords), 'gm'),		css: 'keyword' }			// keyword
		];

	this.CssClass = 'dp-delphi';
	this.Style =	'.dp-delphi .number { color: blue; }' +
					'.dp-delphi .directive { color: #008284; }' +
					'.dp-delphi .vars { color: #000; }';
}

dp.sh.Brushes.Delphi.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.Delphi.Aliases	= ['delphi', 'pascal'];

dp.sh.Brushes.Java = function()
{
	var keywords =	'abstract assert boolean break byte case catch char class const ' +
			'continue default do double else enum extends ' +
			'false final finally float for goto if implements import ' +
			'instanceof int interface long native new null ' +
			'package private protected public return ' +
			'short static strictfp super switch synchronized this throw throws true ' +
			'transient try void volatile while';

	this.regexList = [
		{ regex: dp.sh.RegexLib.SingleLineCComments,							css: 'comment' },		// one line comments
		{ regex: dp.sh.RegexLib.MultiLineCComments,								css: 'comment' },		// multiline comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString,								css: 'string' },		// strings
		{ regex: dp.sh.RegexLib.SingleQuotedString,								css: 'string' },		// strings
		{ regex: new RegExp('\\b([\\d]+(\\.[\\d]+)?|0x[a-f0-9]+)\\b', 'gi'),	css: 'number' },		// numbers
		{ regex: new RegExp('(?!\\@interface\\b)\\@[\\$\\w]+\\b', 'g'),			css: 'annotation' },	// annotation @anno
		{ regex: new RegExp('\\@interface\\b', 'g'),							css: 'keyword' },		// @interface keyword
		{ regex: new RegExp(this.GetKeywords(keywords), 'gm'),					css: 'keyword' }		// java keyword
		];

	this.CssClass = 'dp-j';
	this.Style =	'.dp-j .annotation { color: #646464; }' +
					'.dp-j .number { color: #C00000; }';
}

dp.sh.Brushes.Java.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.Java.Aliases	= ['java'];

dp.sh.Brushes.JScript = function()
{
	var keywords =	'abstract boolean break byte case catch char class const continue debugger ' +
					'default delete do double else enum export extends false final finally float ' +
					'for function goto if implements import in instanceof int interface long native ' +
					'new null package private protected public return short static super switch ' +
					'synchronized this throw throws transient true try typeof var void volatile while with';

	this.regexList = [
		{ regex: dp.sh.RegexLib.SingleLineCComments,				css: 'comment' },			// one line comments
		{ regex: dp.sh.RegexLib.MultiLineCComments,					css: 'comment' },			// multiline comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString,					css: 'string' },			// double quoted strings
		{ regex: dp.sh.RegexLib.SingleQuotedString,					css: 'string' },			// single quoted strings
		{ regex: new RegExp('^\\s*#.*', 'gm'),						css: 'preprocessor' },		// preprocessor tags like #region and #endregion
		{ regex: new RegExp(this.GetKeywords(keywords), 'gm'),		css: 'keyword' }			// keywords
		];

	this.CssClass = 'dp-c';
}

dp.sh.Brushes.JScript.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.JScript.Aliases	= ['js', 'jscript', 'javascript'];

dp.sh.Brushes.Lua = function()
{
	var keywords =	'break do end else elseif function if local nil not or repeat return and then until while this';
	var funcs = 'math\\.\\w+ string\\.\\w+ os\\.\\w+ debug\\.\\w+ io\\.\\w+ error fopen dofile coroutine\\.\\w+ arg getmetatable ipairs loadfile loadlib loadstring longjmp print rawget rawset seek setmetatable assert tonumber tostring';

	this.regexList = [
		{ regex: new RegExp('--\\[\\[[\\s\\S]*\\]\\]--', 'gm'),		css: 'comment'},
		{ regex: new RegExp('--[^\\[]{2}.*$', 'gm'),			css: 'comment' },			// one line comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString,			css: 'string' },	// strings
		{ regex: dp.sh.RegexLib.SingleQuotedString,			css: 'string' },	// strings
		{ regex: new RegExp(this.GetKeywords(keywords), 'gm'),		css: 'keyword' },			// keyword
		{ regex: new RegExp(this.GetKeywords(funcs), 'gm'),		css: 'func' },			// functions
		];

	this.CssClass = 'dp-lua';
}

dp.sh.Brushes.Lua.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.Lua.Aliases	= ['lua'];

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

dp.sh.Brushes.Perl = function()
{
	var funcs = 'abs accept alarm atan2 bind binmode bless caller chdir chmod chomp chop chown chr chroot close closedir connect cos crypt dbmclose dbmopen defined delete dump each endgrent endhostent endnetent endprotoent endpwent endservent eof exec exists exp fcntl fileno flock fork format formline getc getgrent getgrgid getgrnam gethostbyaddr gethostbyname gethostent getlogin getnetbyaddr getnetbyname getnetent getpeername getpgrp getppid getpriority getprotobyname getprotobynumber getprotoent getpwent getpwnam getpwuid getservbyname getservbyport getservent getsockname getsockopt glob gmtime grep hex import index int ioctl join keys kill lc lcfirst length link listen localtime lock log lstat m map mkdir msgctl msgget msgrcv msgsnd no oct open opendir ord pack pipe pop pos print printf prototype push q qq quotemeta qw qx rand read readdir readline readlink readpipe recv ref rename reset reverse rewinddir rindex rmdir scalar seek seekdir semctl semget semop send setgrent sethostent setnetent setpgrp setpriority setprotoent setpwent setservent setsockopt shift shmctl shmget shmread shmwrite shutdown sin sleep socket socketpair sort splice split sprintf sqrt srand stat study sub substr symlink syscall sysopen sysread sysseek system syswrite tell telldir tie tied time times tr truncate uc ucfirst umask undef unlink unpack unshift untie utime values vec waitpid wantarray warn write qr';

	var keywords =	's select goto die do package redo require return continue for foreach last next wait while use if else elsif eval exit unless switch case';

	var declarations = 'my our local';

	this.regexList = [
		{ regex: dp.sh.RegexLib.SingleLinePerlComments, css: 'comment' },			// one line comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString, css: 'string' },				// double quoted strings
		{ regex: dp.sh.RegexLib.SingleQuotedString, css: 'string' },				// single quoted strings
		{ regex: new RegExp('(\\$|@|%)\\w+', 'g'), css: 'vars' },				// variables
		{ regex: new RegExp(this.GetKeywords(funcs), 'gmi'), css: 'func' },			// functions
		{ regex: new RegExp(this.GetKeywords(keywords), 'gm'), css: 'keyword' },			// keyword
		{ regex: new RegExp(this.GetKeywords(declarations), 'gm'), css: 'declarations' }	// declarations
	];

	this.CssClass = 'dp-perl';
}

dp.sh.Brushes.Perl.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.Perl.Aliases	= ['perl'];

dp.sh.Brushes.Php = function()
{
	var funcs	=	'abs acos acosh addcslashes addslashes ' +
					'array_change_key_case array_chunk array_combine array_count_values array_diff '+
					'array_diff_assoc array_diff_key array_diff_uassoc array_diff_ukey array_fill '+
					'array_filter array_flip array_intersect array_intersect_assoc array_intersect_key '+
					'array_intersect_uassoc array_intersect_ukey array_key_exists array_keys array_map '+
					'array_merge array_merge_recursive array_multisort array_pad array_pop array_product '+
					'array_push array_rand array_reduce array_reverse array_search array_shift '+
					'array_slice array_splice array_sum array_udiff array_udiff_assoc '+
					'array_udiff_uassoc array_uintersect array_uintersect_assoc '+
					'array_uintersect_uassoc array_unique array_unshift array_values array_walk '+
					'array_walk_recursive atan atan2 atanh base64_decode base64_encode base_convert '+
					'basename bcadd bccomp bcdiv bcmod bcmul bindec bindtextdomain bzclose bzcompress '+
					'bzdecompress bzerrno bzerror bzerrstr bzflush bzopen bzread bzwrite ceil chdir '+
					'checkdate checkdnsrr chgrp chmod chop chown chr chroot chunk_split class_exists '+
					'closedir closelog copy cos cosh count count_chars date decbin dechex decoct '+
					'deg2rad delete ebcdic2ascii echo empty end ereg ereg_replace eregi eregi_replace error_log '+
					'error_reporting escapeshellarg escapeshellcmd eval exec exit exp explode extension_loaded '+
					'feof fflush fgetc fgetcsv fgets fgetss file_exists file_get_contents file_put_contents '+
					'fileatime filectime filegroup fileinode filemtime fileowner fileperms filesize filetype '+
					'floatval flock floor flush fmod fnmatch fopen fpassthru fprintf fputcsv fputs fread fscanf '+
					'fseek fsockopen fstat ftell ftok getallheaders getcwd getdate getenv gethostbyaddr gethostbyname '+
					'gethostbynamel getimagesize getlastmod getmxrr getmygid getmyinode getmypid getmyuid getopt '+
					'getprotobyname getprotobynumber getrandmax getrusage getservbyname getservbyport gettext '+
					'gettimeofday gettype glob gmdate gmmktime ini_alter ini_get ini_get_all ini_restore ini_set '+
					'interface_exists intval ip2long is_a is_array is_bool is_callable is_dir is_double '+
					'is_executable is_file is_finite is_float is_infinite is_int is_integer is_link is_long '+
					'is_nan is_null is_numeric is_object is_readable is_real is_resource is_scalar is_soap_fault '+
					'is_string is_subclass_of is_uploaded_file is_writable is_writeable mkdir mktime nl2br '+
					'parse_ini_file parse_str parse_url passthru pathinfo readlink realpath rewind rewinddir rmdir '+
					'round str_ireplace str_pad str_repeat str_replace str_rot13 str_shuffle str_split '+
					'str_word_count strcasecmp strchr strcmp strcoll strcspn strftime strip_tags stripcslashes '+
					'stripos stripslashes stristr strlen strnatcasecmp strnatcmp strncasecmp strncmp strpbrk '+
					'strpos strptime strrchr strrev strripos strrpos strspn strstr strtok strtolower strtotime '+
					'strtoupper strtr strval substr substr_compare';

	var keywords =	'and or xor __FILE__ __LINE__ array as break case ' +
					'cfunction class const continue declare default die do else ' +
					'elseif empty enddeclare endfor endforeach endif endswitch endwhile ' +
					'extends for foreach function include include_once global if ' +
					'new old_function return static switch use require require_once ' +
					'var while __FUNCTION__ __CLASS__ ' +
					'__METHOD__ abstract interface public implements extends private protected throw';

	this.regexList = [
		{ regex: dp.sh.RegexLib.SingleLineCComments,				css: 'comment' },			// one line comments
		{ regex: dp.sh.RegexLib.MultiLineCComments,					css: 'comment' },			// multiline comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString,					css: 'string' },			// double quoted strings
		{ regex: dp.sh.RegexLib.SingleQuotedString,					css: 'string' },			// single quoted strings
		{ regex: new RegExp('\\$\\w+', 'g'),						css: 'vars' },				// variables
		{ regex: new RegExp(this.GetKeywords(funcs), 'gmi'),		css: 'func' },				// functions
		{ regex: new RegExp(this.GetKeywords(keywords), 'gm'),		css: 'keyword' }			// keyword
		];

	this.CssClass = 'dp-c';
}

dp.sh.Brushes.Php.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.Php.Aliases	= ['php'];

/* Python 2.3 syntax contributed by Gheorghe Milas */
dp.sh.Brushes.Python = function()
{
    var keywords =  'and assert break class continue def del elif else ' +
                    'except exec finally for from global if import in is ' +
                    'lambda not or pass print raise return try yield while';

    var special =  'None True False self cls class_'

    this.regexList = [
        { regex: dp.sh.RegexLib.SingleLinePerlComments, css: 'comment' },
        { regex: new RegExp("^\\s*@\\w+", 'gm'), css: 'decorator' },
        { regex: new RegExp("(['\"]{3})([^\\1])*?\\1", 'gm'), css: 'comment' },
        { regex: new RegExp('"(?!")(?:\\.|\\\\\\"|[^\\""\\n\\r])*"', 'gm'), css: 'string' },
        { regex: new RegExp("'(?!')*(?:\\.|(\\\\\\')|[^\\''\\n\\r])*'", 'gm'), css: 'string' },
        { regex: new RegExp("\\b\\d+\\.?\\w*", 'g'), css: 'number' },
        { regex: new RegExp(this.GetKeywords(keywords), 'gm'), css: 'keyword' },
        { regex: new RegExp(this.GetKeywords(special), 'gm'), css: 'special' }
        ];

    this.CssClass = 'dp-py';
	this.Style =	'.dp-py .builtins { color: #ff1493; }' +
					'.dp-py .magicmethods { color: #808080; }' +
					'.dp-py .exceptions { color: brown; }' +
					'.dp-py .types { color: brown; font-style: italic; }' +
					'.dp-py .commonlibs { color: #8A2BE2; font-style: italic; }';
}

dp.sh.Brushes.Python.prototype  = new dp.sh.Highlighter();
dp.sh.Brushes.Python.Aliases    = ['py', 'python'];

/* Ruby 1.8.4 syntax contributed by Erik Peterson */
dp.sh.Brushes.Ruby = function()
{
  var keywords =	'alias and BEGIN begin break case class def define_method defined do each else elsif ' +
					'END end ensure false for if in module new next nil not or raise redo rescue retry return ' +
					'self super then throw true undef unless until when while yield';

  var builtins =	'Array Bignum Binding Class Continuation Dir Exception FalseClass File::Stat File Fixnum Fload ' +
					'Hash Integer IO MatchData Method Module NilClass Numeric Object Proc Range Regexp String Struct::TMS Symbol ' +
					'ThreadGroup Thread Time TrueClass'

	this.regexList = [
		{ regex: dp.sh.RegexLib.SingleLinePerlComments,			css: 'comment' },	// one line comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString,				css: 'string' },	// double quoted strings
		{ regex: dp.sh.RegexLib.SingleQuotedString,				css: 'string' },	// single quoted strings
		{ regex: new RegExp(':[a-z][A-Za-z0-9_]*', 'g'),		css: 'symbol' },	// symbols
		{ regex: new RegExp('(\\$|@@|@)\\w+', 'g'),				css: 'variable' },	// $global, @instance, and @@class variables
		{ regex: new RegExp(this.GetKeywords(keywords), 'gm'),	css: 'keyword' },	// keywords
		{ regex: new RegExp(this.GetKeywords(builtins), 'gm'),	css: 'builtin' }	// builtins
		];

	this.CssClass = 'dp-rb';
	this.Style =	'.dp-rb .symbol { color: #a70; }' +
					'.dp-rb .variable { color: #a70; font-weight: bold; }';
}

dp.sh.Brushes.Ruby.prototype = new dp.sh.Highlighter();
dp.sh.Brushes.Ruby.Aliases = ['ruby', 'rails', 'ror'];

dp.sh.Brushes.Sql = function()
{
	var funcs	=	'abs avg case cast coalesce convert count current_timestamp ' +
					'current_user day isnull left lower month nullif replace right ' +
					'session_user space substring sum system_user upper user year';

	var keywords =	'absolute action add after alter as asc at authorization begin bigint ' +
					'binary bit by cascade char character check checkpoint close collate ' +
					'column commit committed connect connection constraint contains continue ' +
					'create cube current current_date current_time cursor database date ' +
					'deallocate dec decimal declare default delete desc distinct double drop ' +
					'dynamic else end end-exec escape except exec execute false fetch first ' +
					'float for force foreign forward free from full function global goto grant ' +
					'group grouping having hour ignore index inner insensitive insert instead ' +
					'int integer intersect into is isolation key last level load local max min ' +
					'minute modify move name national nchar next no numeric of off on only ' +
					'open option order out output partial password precision prepare primary ' +
					'prior privileges procedure public read real references relative repeatable ' +
					'restrict return returns revoke rollback rollup rows rule schema scroll ' +
					'second section select sequence serializable set size smallint static ' +
					'statistics table temp temporary then time timestamp to top transaction ' +
					'translation trigger true truncate uncommitted union unique update values ' +
					'varchar varying view when where with work';

	var operators =	'all and any between cross in join like not null or outer some';

	this.regexList = [
		{ regex: new RegExp('--(.*)$', 'gm'),						css: 'comment' },			// one line and multiline comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString,					css: 'string' },			// double quoted strings
		{ regex: dp.sh.RegexLib.SingleQuotedString,					css: 'string' },			// single quoted strings
		{ regex: new RegExp(this.GetKeywords(funcs), 'gmi'),		css: 'func' },				// functions
		{ regex: new RegExp(this.GetKeywords(operators), 'gmi'),	css: 'op' },				// operators and such
		{ regex: new RegExp(this.GetKeywords(keywords), 'gmi'),		css: 'keyword' }			// keyword
		];

	this.CssClass = 'dp-sql';
	this.Style =	'.dp-sql .func { color: #ff1493; }' +
					'.dp-sql .op { color: #808080; }';
}

dp.sh.Brushes.Sql.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.Sql.Aliases	= ['sql'];

dp.sh.Brushes.Vb = function()
{
	var keywords =	'AddHandler AddressOf AndAlso Alias And Ansi As Assembly Auto ' +
					'Boolean ByRef Byte ByVal Call Case Catch CBool CByte CChar CDate ' +
					'CDec CDbl Char CInt Class CLng CObj Const CShort CSng CStr CType ' +
					'Date Decimal Declare Default Delegate Dim DirectCast Do Double Each ' +
					'Else ElseIf End Enum Erase Error Event Exit False Finally For Friend ' +
					'Function Get GetType GoSub GoTo Handles If Implements Imports In ' +
					'Inherits Integer Interface Is Let Lib Like Long Loop Me Mod Module ' +
					'MustInherit MustOverride MyBase MyClass Namespace New Next Not Nothing ' +
					'NotInheritable NotOverridable Object On Option Optional Or OrElse ' +
					'Overloads Overridable Overrides ParamArray Preserve Private Property ' +
					'Protected Public RaiseEvent ReadOnly ReDim REM RemoveHandler Resume ' +
					'Return Select Set Shadows Shared Short Single Static Step Stop String ' +
					'Structure Sub SyncLock Then Throw To True Try TypeOf Unicode Until ' +
					'Variant When While With WithEvents WriteOnly Xor';

	this.regexList = [
		{ regex: new RegExp('\'.*$', 'gm'),							css: 'comment' },			// one line comments
		{ regex: dp.sh.RegexLib.DoubleQuotedString,					css: 'string' },			// strings
		{ regex: new RegExp('^\\s*#.*', 'gm'),						css: 'preprocessor' },		// preprocessor tags like #region and #endregion
		{ regex: new RegExp(this.GetKeywords(keywords), 'gm'),		css: 'keyword' }			// c# keyword
		];

	this.CssClass = 'dp-vb';
}

dp.sh.Brushes.Vb.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.Vb.Aliases	= ['vb', 'vb.net'];

dp.sh.Brushes.Xml = function()
{
	this.CssClass = 'dp-xml';
	this.Style =	'.dp-xml .cdata { color: #ff1493; }' +
					'.dp-xml .tag, .dp-xml .tag-name { color: #069; font-weight: bold; }' +
					'.dp-xml .attribute { color: red; }' +
					'.dp-xml .attribute-value { color: blue; }';
}

dp.sh.Brushes.Xml.prototype	= new dp.sh.Highlighter();
dp.sh.Brushes.Xml.Aliases	= ['xml', 'xhtml', 'xslt', 'html', 'xhtml'];

dp.sh.Brushes.Xml.prototype.ProcessRegexList = function()
{
	function push(array, value)
	{
		array[array.length] = value;
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
	var regex	= null;

	// Match CDATA in the following format <![ ... [ ... ]]>
	// (\&lt;|<)\!\[[\w\s]*?\[(.|\s)*?\]\](\&gt;|>)
	this.GetMatches(new RegExp('(\&lt;|<)\\!\\[[\\w\\s]*?\\[(.|\\s)*?\\]\\](\&gt;|>)', 'gm'), 'cdata');
	
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
			
		push(this.matches, new dp.sh.Match(match[1], match.index, 'attribute'));
	
		// if xml is invalid and attribute has no property value, ignore it	
		if(match[2] != undefined)
		{
			push(this.matches, new dp.sh.Match(match[2], match.index + match[0].indexOf(match[2]), 'attribute-value'));
		}
	}

	// Match opening and closing tag brackets
	// (\&lt;|<)/*\?*(?!\!)|/*\?*(\&gt;|>)
	this.GetMatches(new RegExp('(\&lt;|<)/*\\?*(?!\\!)|/*\\?*(\&gt;|>)', 'gm'), 'tag');

	// Match tag names
	// (\&lt;|<)/*\?*\s*(\w+)
	regex = new RegExp('(?:\&lt;|<)/*\\?*\\s*([:\\w-\.]+)', 'gm');
	while((match = regex.exec(this.code)) != null)
	{
		push(this.matches, new dp.sh.Match(match[1], match.index + match[0].indexOf(match[1]), 'tag-name'));
	}
}

// PEG Grammars 
dp.sh.Brushes.Peg = function () {
                    
    this.regexList = [
    {regex: dp.sh.RegexLib.SingleLinePerlComments, css: "comment"},
    {regex: dp.sh.RegexLib.DoubleQuotedString,    css: "string"    },
    {regex: dp.sh.RegexLib.SingleQuotedString, css: "string"},
    {regex: /[()[\]{}]/g , css: "delim"},
    {regex: /^(\w+\s*=)|(\w+\s*&lt;-)/gm , css: "builtin"},
    {regex: /^(\s*)\//gm , css: "builtin"},
    {regex: /[=\/,*+!?~]|(&amp;)/g , css: "keyword"}
    //{regex: /[=\/,*+!?~]|[^;](&amp;)[^&]/g , css: "keyword"}
    ];
    this.CssClass = "dp-peg";
    this.Style = ".dp-peg .comment {color: gray;}" +
					'.dp-peg .builtin {color: maroon; font-weight: bold;}' +
                    '.dp-peg .delim {font-weight: bold;}' +
                    ".dp-peg .string {color: red;}" ;
}
dp.sh.Brushes.Peg.prototype = new dp.sh.Highlighter();
dp.sh.Brushes.Peg.Aliases = ["PEG", "peg"];

//}}}
