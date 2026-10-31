<#outputformat "plainText">
<#assign requiredActionsText><#if requiredActions??><#list requiredActions><#items as reqActionItem>${msg("requiredAction.${reqActionItem}")}<#sep>, </#sep></#items></#list></#if></#assign>
</#outputformat>
<#import "template.ftl" as layout>
<@layout.emailLayout>
<@layout.heading text=msg("executeActionsHeading")/>
<@layout.paragraph text=msg("executeActionsIntro", realmName, requiredActionsText)/>
<@layout.button url=link label=msg("executeActionsAction")/>
<@layout.paragraph text=msg("executeActionsIgnore")/>
<@layout.footnote text=msg("linkWorksFor", linkExpirationFormatter(linkExpiration))/>
</@layout.emailLayout>
