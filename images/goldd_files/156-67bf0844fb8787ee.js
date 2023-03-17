"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[156],{7551:function(e,t,r){var n=r(85893),s=r(67294),a=r(58617),i=r(95182);class l extends s.PureComponent{render(){let{cell:e,onImageLoad:t,copied:r,showTopPromptsMd:s,diffMode:l,isBase:o,showFullOutput:c,hideInput:d,hideOutput:h,hidePrompt:u,useIframeForHtml:p,enableMarkdownEdit:g=!1,onCancelEditClick:m=()=>{},onSaveClick:x=()=>{}}=this.props;return(0,n.jsxs)("div",{className:"p-2",children:[(0,n.jsx)(a.Z,{cell:e,onImageLoad:t,copied:r,showTopPromptsMd:s,diffMode:l,isBase:o,hideInput:d,hidePrompt:u,enableMarkdownEdit:g,onCancelEditClick:m,onSaveClick:x}),!h&&(0,n.jsx)(i.Z,{cell:e,onImageLoad:t,showTopPromptsMd:s,diffMode:l,isBase:o,showFullOutput:c,hidePrompt:u,useIframeForHtml:p})]})}}t.Z=l},58617:function(e,t,r){var n=r(85893);r(67294);var s=r(94184),a=r.n(s),i=r(76155),l=r(84206);let o=e=>!e.added&&!e.deleted&&e.srcChanged,c=e=>{let{cell:t={},editMode:r,hidePrompt:s,onImageLoad:c,copied:d,showTopPromptsMd:h,diffMode:u=!1,isBase:p,hideInput:g,className:m,enableMarkdownEdit:x,onCancelEditClick:f,onSaveClick:b}=e;return null!==t.source&&(0,n.jsxs)("div",{className:a()("box-border w-full flex-col items-start lg:flex",u?"":h?"block lg:flex":"lg:flex-row",m),children:[!s&&(0,n.jsx)(i.Z,{blank:"code"!==t.cell_type||g,count:t.execution_count||" ",changed:u&&t.execution_count_changed,isBase:p,className:"pt-px"}),(0,n.jsx)(l.Z,{copied:d,type:t.cell_type,isModified:o(t),additions:t.additions,deletions:t.deletions,onImageLoad:c,srcChanged:t.srcChanged,source:t.source,style:{flex:1},editMode:r,diffMode:u,isBase:p,hideInput:g,enableMarkdownEdit:x,onCancelEditClick:f,onSaveClick:b})]})};t.Z=c},95182:function(e,t,r){r.d(t,{Z:function(){return ea}});var n={};r.r(n),r.d(n,{APP_JS:function(){return O},APP_JSON:function(){return J},HTML:function(){return I},IMAGE_GIF:function(){return G},IMAGE_JPEG:function(){return B},IMAGE_JPG:function(){return A},IMAGE_PNG:function(){return z},IMAGE_SVG:function(){return U},LATEX:function(){return F},MARKDOWN:function(){return R},TEXT:function(){return _},TEXT_JS:function(){return D},supportedTypes:function(){return K}});var s=r(85893),a=r(67294),i=r(94184),l=r.n(i),o=r(76155),c=r(1458),d=r(68699),h=r(29054);let u=e=>{switch(e){case"ansi-black":case"ansi-bright-black":return"bg-black dark:bg-white";case"ansi-red":case"ansi-bright-red":return"bg-red-alpha-dark dark:bg-red-alpha-light";case"ansi-green":return"bg-green-alpha-light dark:bg-green-alpga-dark";case"ansi-bright-green":return"bg-green-alpha-dark dark:bg-green-alpga-light";case"ansi-yellow":case"ansi-bright-yellow":return"bg-yellow-600 dark:bg-yellow-300";case"ansi-blue":case"ansi-bright-blue":return"bg-blue-600 dark:bg-blue-300";case"ansi-magenta":case"ansi-bright-magenta":return"bg-red-500 dark:bg-red-400";case"ansi-cyan":case"ansi-bright-cyan":return"bg-green-600 dark:bg-green-300";case"ansi-white":case"ansi-bright-white":return"bg-white dark:bg-black";default:return""}},p=e=>{switch(e){case"ansi-black":case"ansi-bright-black":return"text-black dark:text-white";case"ansi-red":case"ansi-bright-red":return"text-red-600 dark:text-red-300";case"ansi-green":case"ansi-bright-green":case"ansi-cyan":case"ansi-bright-cyan":return"text-green-600 dark:text-green-300";case"ansi-yellow":case"ansi-bright-yellow":return"text-yellow-600 dark:text-yellow-300";case"ansi-blue":case"ansi-bright-blue":return"text-blue-600 dark:text-blue-300";case"ansi-magenta":case"ansi-bright-magenta":return"text-red-500 dark:text-red-400";case"ansi-white":case"ansi-bright-white":return"text-white dark:text-black";default:return""}},g=e=>(e=(0,d.escapeCarriageReturn)(e),(0,c.ansiToJson)(e,{json:!0,remove_empty:!0,use_classes:!0})),m=(e,t,r)=>{let n="whitespace-pre-wrap";return t.bg&&(n+=" ".concat(u(t.bg))),t.fg&&(n+=" ".concat(p(t.fg))),(0,s.jsx)("span",{className:n,children:e?(0,h.a)(t.content):t.content},r)},x=e=>{let{children:t,linkify:r,className:n,style:a,...i}=e;return(0,s.jsx)("code",{...i,className:l()(n,"text-sm text-gray-900 dark:text-gray-100"),style:{...a,fontSize:14},children:g(t).map(m.bind(null,r))})},f=e=>{let{data:t,style:r,className:n}=e;return(0,s.jsx)("pre",{style:{fontSize:14,tabSize:4},className:"m-0",children:(0,s.jsx)(x,{style:r,className:n,linkify:!0,children:"string"==typeof t?t:t.join("")})})};var b=r(59996);let y=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:[];return e.map(Function.prototype.call,String.prototype.trim)},v=e=>"string"==typeof e?e:y(e).join("\n"),j=e=>{let{data:t=""}=e;return(0,s.jsx)("div",{className:"rendered_html",children:(0,s.jsx)(b.wZ,{content:v(t),transform:w})})},w=e=>{if(e&&"svg"===e.tagName){let t=k(e.outerHTML);return(0,s.jsx)("img",{src:t,alt:"svg"})}},k=e=>{let t=new Blob([e],{type:"image/svg+xml"}),r=URL.createObjectURL(t);return r},N=e=>{let t={};if(e.metadata){let{width:r,height:n}=e.metadata;t={width:r,height:n}}return(0,s.jsx)("div",{className:"rendered_html",children:(0,s.jsx)("img",{alt:"Notebook Image",src:"data:".concat(e.type,";base64,").concat(e.data),...t,onLoad:e.onImageLoad,className:e.className,style:{display:"block",maxWidth:"100%",objectFit:"contain",...e.style}})})},S=e=>{let{data:t}=e;return(0,s.jsx)("code",{className:"font-mono text-gray-900",style:{fontSize:14},children:t})};var E=r(99902);let C=e=>{let{data:t}=e;return(0,s.jsx)(E.xv,{children:t})};var M=r(52764),T=r(14924),Z=r(92360);let P="https://jovian-iframe-staging.web.app";class H extends a.Component{componentDidMount(){this.el.addEventListener("load",this.handlePostMessage),window.addEventListener("message",this.handleReceiveMessage)}componentWillUnmount(){window.removeEventListener("message",this.handleReceiveMessage)}componentDidUpdate(e){let{theme:t}=this.props;if(t!==e.theme){let e=this.el.contentWindow;e.postMessage({theme:t},P)}}render(){return(0,s.jsx)(s.Fragment,{children:(0,s.jsx)("iframe",{id:"x",title:"iframe",ref:e=>this.el=e,src:P,style:{height:this.state.iframeHeight,width:"100%",colorScheme:"auto"},frameBorder:"0"})})}constructor(...e){super(...e),(0,T.Z)(this,"state",{iframeHeight:0}),(0,T.Z)(this,"handleReceiveMessage",e=>{e.source===this.el.contentWindow&&e.origin===P&&e.data.resizeHeight&&this.setState({iframeHeight:e.data.resizeHeight+16})}),(0,T.Z)(this,"handlePostMessage",()=>{let e=this.el.contentWindow,t='\n    let container = document.createElement("div");\n    container = document.createElement("div");\n    container.setAttribute("class", "rendered_html");\n    container.innerHTML = decodeURIComponent(\n      "'.concat(encodeURIComponent(v(this.props.data)),'"\n    );\n    document.body.appendChild(container);\n    // Force the found scripts to execute\n    let intervals = {};\n    let srcCount = 0;\n    let hasPlotlyGraph = false;\n    let hasPlotlyScript = false;\n    const REQUIRE_SCRIPT =\n      "https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js";\n    const PLOTLY_SCRIPT = "https://jovian-iframe.web.app/plotly.js";\n    const addScript = (root, src) => {\n      let script = document.createElement("script");\n      script.src = src;\n      root.appendChild(script);\n    };\n    container.querySelectorAll("script").forEach(script => {\n      if (script.hasAttribute("src")) {\n        srcCount += 1;\n        if (script.src && script.src.includes("cdn.plot.ly")){\n          hasPlotlyScript = true;\n        }\n      }\n      if (script.innerHTML && script.innerHTML.search("Plotly")) {\n        hasPlotlyGraph = true;\n      }\n    });\n    if (hasPlotlyGraph && !hasPlotlyScript) {\n      addScript(container, REQUIRE_SCRIPT);\n      addScript(container, PLOTLY_SCRIPT);\n      srcCount += 2;\n    }\n    container.querySelectorAll("script").forEach((script, i) => {\n      let scriptEl = document.createElement("script");\n      scriptEl.type = script.type || "text/javascript";\n      if (script.hasAttribute("src")) {\n        scriptEl.onload = () => (srcCount -= 1);\n        scriptEl.src = script.src;\n        document.head.appendChild(scriptEl);\n        document.head.removeChild(scriptEl);\n      } else if (script.innerHTML) {\n        intervals[i] = setInterval(() => {\n          if (srcCount <= 0) {\n            scriptEl.innerHTML = script.innerHTML;\n            document.head.appendChild(scriptEl);\n            document.head.removeChild(scriptEl);\n            clearInterval(intervals[i]);\n          }\n        }, 30);\n      }\n    });\n    ');e.postMessage({iframeEvaluation:t,theme:this.props.theme},P)})}}var L=(0,Z.Z)(H);let _="text/plain",I="text/html",F="text/latex",R="text/markdown",z="image/png",A="image/jpg",B="image/jpeg",G="image/gif",U="image/svg+xml",D="text/javascript",O="application/javascript",J="application/json",K=[_,I,G,B,z,A,U,D,O,J,F,R],W=e=>{let{data:t}=e;return(0,s.jsx)("div",{children:(0,s.jsx)("pre",{style:{fontSize:14,tabSize:4},className:"m-0",children:JSON.stringify(t,void 0,2)})})},$=(e,t)=>{switch(e){case _:return f;case I:return t?L:j;case G:case B:case A:case z:return N;case D:return S;case J:return W;case F:return C;case R:return M.Z;case U:return t?L:j;default:return()=>null}},q=[G,B,A,z],X=e=>{let{type:t,data:r,onImageLoad:n,style:a,className:i,useIframeForHtml:l=!1}=e,o=$(t,l),c=q.includes(t)?{onImageLoad:n}:{};return(0,s.jsx)(o,{type:t,data:r,className:i,...c,style:a})};Object.keys(n).forEach(e=>X[e]=n[e]);let Q=e=>{let{traceback:t,ename:r,evalue:n,style:a,className:i}=e;return(0,s.jsx)(x,{style:a,className:i,children:t?t.join("\n"):"".concat(r,": ").concat(n)})},Y=e=>{let{text:t,name:r,style:n,className:a}=e;return(0,s.jsx)("div",{className:l()("flex-1 py-1 px-1 lg:px-0","stderr"===r&&"bg-red-200 dark:bg-red-900",a),children:(0,s.jsx)(x,{style:n,linkify:!0,children:"string"==typeof t?t:t.join("")})})},V=[J,O,D,I,R,F,U,G,z,B,A,_],ee=e=>{for(let t=0;t<V.length;t++){let r=V[t],n=e.data[r];if(n)return(0,s.jsx)(X,{type:r,data:n,style:e.style,className:e.className,onImageLoad:e.onImageLoad,useIframeForHtml:e.useIframeForHtml})}return null},et=e=>"error"===e?Q:"stream"===e?Y:ee,er=e=>{let t=et(e.output_type);return(0,s.jsx)(t,{...e})},en=e=>e.changed&&e.isBase||e.deleted?"bg-red-alpha-light dark:bg-red-alpha-dark":e.changed&&!e.isBase||e.added?"bg-green-alpha-light dark:bg-green-alpha-dark":"transparent",es=e=>{let{cell:t={},isBase:r,diffMode:n,onImageLoad:a,showTopPromptsMd:i,showFullOutput:c,hidePrompt:d,useIframeForHtml:h}=e;return t.outputs&&t.outputs.length>0?(0,s.jsx)("div",{className:"overflow-y-auto pt-px",style:{maxHeight:c?"initial":"640px"},children:t.outputs.map((e,c)=>(0,s.jsxs)("div",{className:l()("box-border w-full flex-col items-start",n?"lg:flex":i?"block":"lg:flex lg:flex-row"),children:[!d&&(0,s.jsx)(o.Z,{blank:"execute_result"!==e.output_type,count:t.execution_count,changed:n&&t.execution_count_changed,out:!0,isBase:r,className:"pt-px"}),(0,s.jsx)("div",{className:l()("flex flex-1 overflow-auto","execute_result"===e.output_type&&"py-1 px-1 lg:px-0"),children:(0,s.jsx)(er,{...e,className:en({...e,isBase:r}),diffMode:n,onImageLoad:a,useIframeForHtml:h})})]},c))}):null};var ea=es},76155:function(e,t,r){var n=r(85893);r(67294);var s=r(94184),a=r.n(s);let i=e=>{let{count:t=" ",className:r,blank:s,out:i,changed:l,isBase:o}=e;return(0,n.jsx)("div",{className:r,children:(0,n.jsx)("div",{className:a()("box-border block w-20 select-none whitespace-nowrap font-mono text-sm leading-5",s?"p-0":i?"p-1":"py-2 px-1",i?"text-red-800 dark:text-red-500":"text-blue-900 dark:text-blue-200"),children:!s&&(0,n.jsxs)(n.Fragment,{children:[i?"Out":"In ","[",(0,n.jsx)("span",{className:a()(l?o?"bg-red-alpha-light dark:bg-red-alpha-dark":"bg-green-alpha-light dark:bg-green-alpha-dark":"bg-transparent"),children:t}),"]:"]})})})};t.Z=i},84206:function(e,t,r){r.d(t,{Z:function(){return b}});var n=r(85893),s=r(67294),a=r(94184),i=r.n(a);let l=e=>{let{source:t=[],hideInput:r,copied:s,language:a,wrapperClassName:l,wrapperStyle:o,highlighterClass:c,codeTagProps:d,tabSize:h,Highlighter:u,style:p}=e;return"python"===a&&r?null:(0,n.jsx)("div",{className:l,style:o,children:(0,n.jsx)(u,{language:a,style:p,wrapLines:!1,className:i()(c,"p-2",s?"bg-yellow-300 dark:bg-gray-cell-hover":"bg-gray-50 dark:bg-gray-code-cell"),customStyle:{tabSize:h},codeTagProps:d,children:"string"==typeof t?t:t.join("")})})};var o=r(52764),c=r(8722),d=r(5152),h=r.n(d),u=r(92360),p=r(15572),g=r(58512);let m=h()(()=>r.e(9225).then(r.bind(r,9225)),{loadableGenerated:{webpack:()=>[9225]}}),x=h()(()=>Promise.all([r.e(1637),r.e(6202)]).then(r.bind(r,81085)),{loadableGenerated:{webpack:()=>[81085]}}),f=e=>{let{diffMode:t,editMode:r,type:a,onImageLoad:i,source:d,theme:h,enableMarkdownEdit:u,onSaveClick:f=async()=>{},onCancelEditClick:b,...y}=e,[v,j]=(0,s.useState)(void 0),[w,k]=(0,s.useState)(!1),N=!v||JSON.stringify("string"==typeof d?d:d.join(""))===JSON.stringify(v);if("markdown"===a&&!r)return u?(0,n.jsx)(p.Z,{className:"w-full",description:void 0!==v?v:"string"==typeof d?d:d.join(""),disableSave:N,onChange:e=>j(e.target.value),readOnly:w,actionButtons:(0,n.jsxs)("div",{className:"flex",children:[(0,n.jsx)(g.Z,{className:"ml-2",variant:"light",onClick:()=>{j(void 0),b()},title:"Cancel",size:"sm",style:{width:"80px"}}),(0,n.jsx)(g.Z,{className:"ml-2",variant:"outline-primary",onClick:async()=>{k(!0),await f(v),j(void 0),k(!1)},disabled:N,showSpinner:!1,title:"Save",size:"sm",inProgressTitle:"Saving..",style:{width:"80px"}})]})}):(0,n.jsx)(o.Z,{data:d?"string"==typeof d?d:d.join(""):"",onImageLoad:i,diffMode:t,decrementHeadingTags:!0,...y});d&&0!==d.length&&(1!==d.length||0!==d[0].length)||(d=[" "]);let S="dark"===h;return(0,n.jsx)(t?m:l,{...y,source:d,language:"code"===a?"python":"markdown"===a?"markdown":"text",wrapperClassName:"border border-solid border-gray-300 dark:border-gray-600 rounded-sm font-mono text-sm overflow-auto text-gray-900 dark:text-gray-100 box-border w-full leading-5",wrapperStyle:{fontSize:14},highlighterClass:"font-mono box-border m-0",codeTagProps:{className:"font-mono text-sm break-normal box-border"},tabSize:4,Highlighter:x,isDark:S,style:(0,c.Z)(S,t)})};var b=(0,u.Z)(f)},48529:function(e,t,r){r.d(t,{NL:function(){return n.Z},bL:function(){return s.Z}});var n=r(76155);r(84206),r(58617),r(95182);var s=r(7551)},58512:function(e,t,r){var n=r(85893),s=r(67294),a=r(61839),i=r(50915);let l=()=>(0,n.jsx)("div",{className:"flex h-5 w-5",children:(0,n.jsx)(i.Z,{className:"h-auto w-auto"})}),o=e=>{let{onClick:t,disabled:r,Icon:i,title:o,inProgressTitle:c,showSpinner:d=!0,...h}=e,[u,p]=(0,s.useState)(!1),g=async e=>{t&&(p(!0),await t(e),p(!1))};return(0,n.jsx)(a.Z,{onClick:g,disabled:r||u,Icon:u&&d?l:i,title:u&&c?c:o,...h})};t.Z=o},65402:function(e,t,r){var n=r(85893),s=r(67294),a=r(48529),i=r(5434),l=r(94184),o=r.n(l),c=r(28928),d=r(52764),h=r(26183);class u extends s.Component{componentWillUnmount(){let e=this.preview,{setEditorHeight:t}=this.props;e&&t&&t(e)}componentDidUpdate(){this.preview&&(this.preview.scrollTop=this.props.scrollPosition)}render(){let{showPrompt:e=!1,source:t,canEdit:r,onEditClick:s,style:l,allowResize:u=!1,decrementHeadingTags:p,height:g,noPadding:m=!1,onScroll:x,previewClassName:f="",renderMathJax:b}=this.props;return(0,n.jsxs)("div",{style:l,className:o()("flex h-auto",{"p-2":t,"py-0":m}),children:[e&&(0,n.jsx)(a.NL,{blank:!0,className:"hidden lg:block"}),(0,n.jsxs)(h.Z,{forceLoad:b,children:[(0,n.jsx)(d.Z,{ref:e=>this.preview=e,data:t||"",onScroll:x,decrementHeadingTags:p,className:o()("scroll overflow-y-auto",u&&"resize-y",f),style:{height:g}})," "]}),r&&(0,n.jsx)(c.Z,{Icon:i.zmo,tooltipDelay:{show:0,hide:0},size:16,tip:"Edit Description",onClick:s,className:"-mt-1 self-start",style:{marginRight:"-0.5rem"}})]})}}t.Z=u},15572:function(e,t,r){r.d(t,{Z:function(){return v}});var n=r(14924),s=r(85893),a=r(67294),i=r(48529),l=r(61839),o=r(46155),c=r(94184),d=r.n(c),h=r(99436);let u=e=>{let{noPadding:t}=e;return(0,s.jsxs)("div",{className:d()(!t&&"px-2","flex items-center text-sm text-gray-400 opacity-75 dark:text-gray-300"),children:["Use\xa0",(0,s.jsx)(h.Z,{className:"leading-tight",href:"https://commonmark.org/help/",children:"Markdown"}),(0,s.jsx)("span",{className:"hidden sm:inline",children:"\xa0for styling"})]})};class p extends a.Component{componentWillUnmount(){let e=this.editor,{setEditorHeight:t}=this.props;e&&t&&t(e)}render(){let{showPrompt:e=!1,style:t,value:r,name:n,onChange:a,handleKeyDown:l,fieldRef:c,rows:d=5,height:h,disabled:u,setEditorHeight:p,noBorder:g,onScroll:m,wrapperStyle:x,...f}=this.props;return(0,s.jsxs)("div",{className:"flex h-auto px-2",ref:e=>this.editor=e,style:x,children:[e&&(0,s.jsx)(i.NL,{blank:!0,className:"hidden md:block"}),(0,s.jsx)(o.Z,{id:"markdownEditor",ref:c,as:"textarea",className:"flex-1 resize-y overflow-y-auto rounded font-mono text-sm",name:n,value:r||"",rows:d,onScroll:m,onChange:a,onKeyDown:l,style:{fontSize:"0.75rem",height:h,...t},disabled:u,...f})]})}}p.Footer=e=>{let{showPrompt:t,buttonsDisabled:r,onSaveClick:n,onCancelClick:a}=e;return(0,s.jsxs)("div",{className:"flex items-baseline pr-2 pb-4",children:[t&&(0,s.jsx)(i.NL,{blank:!0,className:"hidden md:block"}),(0,s.jsx)("div",{style:{flex:1}}),(0,s.jsx)(u,{}),(0,s.jsx)(l.Z,{className:"mr-2",title:"Cancel",disabled:r,onClick:a}),(0,s.jsx)(l.Z,{title:"\xa0\xa0Save\xa0\xa0",variant:"primary",disabled:r,onClick:n})]})},p.Footer.displayName="MarkdownEditor.Footer";var g=r(65402),m=r(21588);let{Pane:x,Content:f}=m.Z;class b extends a.Component{componentDidUpdate(){this.field&&(this.field.scrollTop=this.state.scrollPosition)}componentDidMount(){let{autoFocus:e=!1,readOnly:t=!1,scrollToEnd:r=!1}=this.props;e&&this.field.focus(),r&&(this.field.setSelectionRange(this.field.value.length,this.field.value.length),setTimeout(()=>{this.field.scrollTop=this.field.scrollHeight},10)),t&&this.setState({activeKey:"preview"})}render(){let{showPrompt:e=!1,description:t,name:r,onChange:n,className:a,handleKeyDown:i,editorStyle:l,readOnly:o,placeholder:c,showGeneratedHtmlTab:h=!1,generatedHtml:b="",previewClassName:v="",showMarkdownHelp:j=!0,allowPreviewResize:w=!0,editorWrapperStyle:k,actionButtons:N,headerClassName:S,renderMathJax:E,enableTouchForTabs:C}=this.props,{activeKey:M,editorFocused:T}=this.state;return(0,s.jsxs)("div",{className:d()("rounded border border-solid border-gray-200 dark:border-gray-500",T?"outline-none border border-blue-200 shadow-input dark:border-gray-600":"",a),children:[(0,s.jsxs)("div",{className:d()("mt-2 flex justify-between border-b border-solid border-gray-200 px-2 pb-2 text-sm dark:border-gray-500",S),children:[(0,s.jsxs)("div",{className:"flex grow items-center",children:[(0,s.jsx)(y,{active:"write"===M,onClick:()=>this.selectTab("write"),title:"Write",enableTouch:C}),(0,s.jsx)(y,{active:"preview"===M,onClick:()=>this.selectTab("preview"),title:"Preview",enableTouch:C}),h&&(0,s.jsx)(y,{active:"generatedHtml"===M,onClick:()=>this.selectTab("generatedHtml"),title:"Generated HTML"})]}),j&&"preview"===M?(0,s.jsx)(u,{noPadding:!0}):null,N]}),(0,s.jsx)(m.Z,{activeKey:M,children:(0,s.jsxs)(f,{className:"flex flex-col flex-1",children:[(0,s.jsx)(x,{eventKey:"write",className:"h-full",children:(0,s.jsx)(p,{fieldRef:e=>this.field=e,showPrompt:e,value:t,name:r,onChange:n,placeholder:c||"# Enter a Title\n\nEnter some description",noBorder:!0,onFocus:this.handleFocus,onBlur:this.handleBlur,handleKeyDown:i,style:{boxShadow:"none",fontSize:14,border:0,padding:0,...l},height:this.state.editorHeight,wrapperStyle:k,setEditorHeight:this.setEditorHeight,onScroll:this.handleScroll,disabled:o})}),(0,s.jsx)(x,{eventKey:"preview",children:(0,s.jsx)(g.Z,{showPrompt:e,canEdit:!1,source:t,allowResize:w,noPadding:!0,height:this.state.editorHeight,setEditorHeight:this.setEditorHeight,setEditorScroll:this.setEditorScroll,previewClassName:v,onScroll:this.handleScroll,scrollPosition:this.state.scrollPosition,renderMathJax:E})}),h&&(0,s.jsx)(x,{eventKey:"generatedHtml",children:(0,s.jsx)(p,{fieldRef:e=>this.field=e,showPrompt:e,value:b,name:r,onChange:()=>{},placeholder:c||"No Preview Available",noBorder:!0,onFocus:this.handleFocus,onBlur:this.handleBlur,handleKeyDown:()=>{},style:{boxShadow:"none",border:0,padding:0,...l},height:this.state.editorHeight,setEditorHeight:this.setEditorHeight,disabled:!0})})]})})]})}constructor(...e){super(...e),(0,n.Z)(this,"state",{editorFocused:!1,activeKey:"write",editorHeight:this.props.height,scrollPosition:0}),(0,n.Z)(this,"handleScroll",e=>{let{scrollTop:t}=e.target;this.setState({scrollPosition:t})}),(0,n.Z)(this,"handleFocus",()=>this.setState({editorFocused:!0})),(0,n.Z)(this,"handleBlur",()=>this.setState({editorFocused:!1})),(0,n.Z)(this,"selectTab",e=>this.setState({activeKey:e})),(0,n.Z)(this,"setEditorHeight",e=>this.setState({editorHeight:e.clientHeight||this.props.height}))}}let y=e=>{let{active:t,onClick:r,title:n,enableTouch:a}=e;return(0,s.jsx)("div",{className:d()("cursor-pointer px-2",t?"font-medium text-gray-900 dark:text-gray-100 ":"text-gray-400 dark:text-gray-300"),onClick:r,onTouchEnd:a&&r,children:n})};b.defaultProps={height:"192px"};var v=b},26183:function(e,t,r){r.d(t,{Z:function(){return u}});var n=r(85893),s=r(99902),a=r(67294),i={tex2jax:{inlineMath:[["$","$"],["\\(","\\)"]],displayMath:[["$$","$$"],["\\[","\\]"]],processEscapes:!0,processEnvironments:!0},messageStyle:"none",displayAlign:"center",CommonHTML:{linebreaks:{automatic:!0}}};let l=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:[],t=arguments.length>1&&void 0!==arguments[1]&&arguments[1];return t?e.some(e=>e.some(e=>"markdown"===e.cellType)):e.some(e=>"markdown"===e.cell_type)},o=e=>{if(void 0!==e&&e&&e.Hub)try{e.Hub.Queue(["Typeset",e.Hub])}catch(e){}},c=e=>{let{loaded:t,children:r}=e,{MathJax:i}=(0,a.useContext)(s._y);return t||o(i),(0,n.jsx)(n.Fragment,{children:r})},d=e=>{let{cells:t,children:r,diff:o,forceLoad:d=!1}=e,[h,u]=(0,a.useState)(!1),p=(0,a.useMemo)(()=>t,[t]);return(0,a.useEffect)(()=>{u(!1)},[p]),l(t,o)||d?(0,n.jsx)(s.zt,{src:"https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-MML-AM_CHTML",input:"tex",onError:e=>{},onLoad:()=>u(!0),options:i,children:(0,n.jsx)(c,{loaded:h,children:r})}):(0,n.jsx)(n.Fragment,{children:r})},h=a.memo(e=>{let{cells:t,children:r,diff:s,forceLoad:a}=e;return(0,n.jsx)(d,{cells:t,diff:s,forceLoad:a,children:r})});var u=h}}]);