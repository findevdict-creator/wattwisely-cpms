<#import "template.ftl" as layout>
<@layout.emailLayout>
<@layout.heading text=msg("emailUpdateConfirmationHeading")/>
<@layout.paragraph text=msg("emailUpdateConfirmationIntro", newEmail, realmName)/>
<@layout.button url=link label=msg("emailUpdateConfirmationAction")/>
<@layout.paragraph text=msg("emailUpdateConfirmationIgnore")/>
<@layout.footnote text=msg("linkWorksFor", linkExpirationFormatter(linkExpiration))/>
</@layout.emailLayout>
