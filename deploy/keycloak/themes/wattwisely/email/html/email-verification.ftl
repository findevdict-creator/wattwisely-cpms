<#import "template.ftl" as layout>
<@layout.emailLayout>
<@layout.heading text=msg("emailVerificationHeading")/>
<@layout.paragraph text=msg("emailVerificationIntro", realmName)/>
<@layout.button url=link label=msg("emailVerificationAction")/>
<@layout.paragraph text=msg("emailVerificationIgnore")/>
<@layout.footnote text=msg("linkWorksFor", linkExpirationFormatter(linkExpiration))/>
</@layout.emailLayout>
