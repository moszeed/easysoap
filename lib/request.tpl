<?xml version="1.0" encoding="UTF-8"?>
<soap-env:Envelope
    xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/"
    <% if (namespace !== false) { %> xmlns:ns1="<%= namespace%>"<%}%>
    <% if (header    !== false) { %>
        <% var ns_no = 2; %>
        <% _(header).each(function(single_header) { %>
            <% if (single_header.namespace !== void 0) { %>
                xmlns:ns<%= ns_no%>="<%=single_header.namespace%>"
            <% } %>
            <% ns_no++; %>
        <% }); %>
    <% } %>>

<% if (header !== false) { %>
<soap-env:Header>
    <% var ns_no = 2; %>
    <% _(header).each(function(single_header) { %>
        <<% if(single_header.namespace) {%>ns<%=ns_no%>:<%}%><%= single_header.name%>><%= single_header.value%></<% if(single_header.namespace) {%>ns<%=ns_no%>:<%}%><%= single_header.name%>>
        <% ns_no++; %>
    <% }); %>
</soap-env:Header>
<% } %>

<soap-env:Body>
    <% if (namespace !== false) {%><ns1:<%=method%>><% } %>
        <<%=method%>><% if (params !== false) {%><%= params%><% } %></<%=method%>>
    <% if (namespace !== false) {%></ns1:<%=method%>><% } %>
</soap-env:Body>
</soap-env:Envelope>