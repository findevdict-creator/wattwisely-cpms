<#-- Wattwisely: the layout of every e-mail Keycloak sends, the same as the platform's own e-mails -->
<#-- (packages/mail, BrandedMailLayout): a bar in the brand color with the name, the message, the  -->
<#-- footer. Keycloak's own templates fill it with their message; ours use the macros below.      -->
<#import "theme-colours.ftl" as theme>

<#macro emailLayout>
<html lang="${locale.language}" dir="${(ltr)?then('ltr','rtl')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  p { margin: 0 0 12px; }
  a { color: ${theme.brandDark}; }
</style>
</head>
<body style="margin:0;padding:0;background:${theme.surface}">
<div style="margin:0;padding:24px 12px;background:${theme.surface};font-family:${theme.fontFamily},'Helvetica Neue',Arial,sans-serif;color:${theme.ink};font-size:15px;line-height:1.5">
<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;width:100%;background:${theme.white};border-radius:12px;overflow:hidden">
<tr><td style="background:${theme.primary};color:${theme.onPrimary};padding:16px 24px;font-size:18px;font-weight:600">${realmName}</td></tr>
<tr><td style="padding:24px">
<#nested>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid ${theme.line};font-size:13px;color:${theme.text2}">${msg("emailFooter", realmName)}</td></tr>
</table>
</div>
</body>
</html>
</#macro>

<#macro heading text>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:600">${text}</h1>
</#macro>

<#macro paragraph text>
<p style="margin:0 0 12px">${text}</p>
</#macro>

<#macro button url label>
<p style="margin:20px 0"><a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:${theme.primary};color:${theme.onPrimary};text-decoration:none;font-weight:600">${label}</a></p>
</#macro>

<#-- Small print under the message, such as how long the link works. -->
<#macro footnote text>
<p style="margin:16px 0 0;font-size:13px;color:${theme.text2}">${text}</p>
</#macro>
