<#-- Wattwisely: the line under the card. "wwFooterHtml" in messages_en.properties, for every page or -->
<#-- for one page (see ww.ftl); links are allowed. -->
<#import "ww.ftl" as ww>
<#macro content>
  <#assign wwFooter = ww.forPage("wwFooterHtml")>
  <#if wwFooter?has_content>
    <p>${kcSanitize(wwFooter)?no_esc}</p>
  </#if>
</#macro>
