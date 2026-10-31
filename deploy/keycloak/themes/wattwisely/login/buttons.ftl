<#-- Wattwisely: keycloak.v2's buttons.ftl from Keycloak 26.8.1; a label can differ by page (ww.forPage). -->
<#import "ww.ftl" as ww>
<#macro actionGroup horizontal=false>
  <div class="${properties.kcFormGroupClass}">
    <div class="${properties.kcFormActionGroupClass} <#if horizontal>pf-v5-u-flex-nowrap<#else>pf-v5-u-flex-wrap</#if>">
      <#nested>
    </div>
  </div>
</#macro>

<#macro button label id="" name="" type="primary" fullWidth=true class=[] extra...>
  <button class="${properties['kcButton' + type?cap_first + 'Class']}<#if fullWidth> ${properties.kcButtonBlockClass}</#if><#list class as c> ${properties[c]}</#list>" name="${name}" id="${id}"
          type="submit" <#list extra as attrName, attrVal>${attrName}="${attrVal}"</#list>>
  ${ww.forPage(label)}
  </button>
</#macro>

<#macro buttonLink href label id="" class=["kcButtonSecondaryClass", "kcButtonBlockClass"]>
  <a id="${id}" href="${href}" class="<#list class as c>${properties[c]} </#list>">${ww.forPage(label)}</a>
</#macro>

<#macro loginButton>
  <@buttons.actionGroup>
    <@buttons.button id="kc-login" name="login" label="doLogIn" />
  </@buttons.actionGroup>
</#macro>