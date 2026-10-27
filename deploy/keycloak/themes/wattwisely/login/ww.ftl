<#-- Wattwisely: wording that differs by page, from messages_en.properties.                  -->
<#-- forPage("doSubmit") on the reset-password page looks for "doSubmit.login-reset-password.<app>" -->
<#-- (the app being the client, such as wattwisely-driver), then "doSubmit.login-reset-password",  -->
<#-- then "doSubmit"; it gives "" when none of them is a message. A page is its template's name    -->
<#-- without ".ftl"; msg() gives the key itself back when there is no such message.                 -->
<#function forPage key>
  <#local page = key + "." + (pageId!"")>
  <#list [page + "." + ((client.clientId)!""), page, key] as candidate>
    <#local text = msg(candidate)>
    <#if text != candidate>
      <#return text>
    </#if>
  </#list>
  <#return "">
</#function>
