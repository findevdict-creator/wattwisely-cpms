<#import "template.ftl" as layout>
<@layout.emailLayout>
<@layout.heading text=msg("passwordResetHeading")/>
<@layout.paragraph text=msg("passwordResetIntro", realmName)/>
<@layout.button url=link label=msg("passwordResetAction")/>
<@layout.paragraph text=msg("passwordResetIgnore")/>
<@layout.footnote text=msg("linkWorksFor", linkExpirationFormatter(linkExpiration))/>
</@layout.emailLayout>
