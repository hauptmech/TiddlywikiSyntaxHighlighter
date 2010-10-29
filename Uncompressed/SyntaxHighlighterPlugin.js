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

    highlighter.noGutter = (showGutter == null) ? IsOptionSet('nogutter', options) : !showGutter;
    highlighter.addControls = (showControls == null) ? !IsOptionSet('nocontrols', options) : showControls;
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
		switch(w.matchText) {
		case "/*{{{*/\n": // CSS
			dp.sh.Highlight(element, 'css');
			break;
		case "//{{{\n": // plugin
			dp.sh.Highlight(element, 'js');
			break;
		case "<!--{{{-->\n": //template
			dp.sh.Highlight(element, 'xml');
			break;
		}
		w.nextMatch = lookaheadMatch.index + lookaheadMatch[0].length;
	}
}