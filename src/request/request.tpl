<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope
    <% if (envelope.namespaces !== null) { %>
        <% _.each(envelope.namespaces, function(namespace) { %>
            <% if (namespace.full !== void 0) { %>
            xmlns:<%=namespace.short%>="<%=namespace.full%>"
            <% } %>
        <% }); %>
    <% } else { %>
    xmlns:SOAP-ENV="<%= envelope.soap_env%>"
    <% } %>>

    <% if (head !== null) { %>
        <SOAP-ENV:Header>
            <% _.each(head, function(headItem) { %>
                <%= headItem%>
            <% }); %>
        </SOAP-ENV:Header>
    <% } %>

    <SOAP-ENV:Body><%= body%></SOAP-ENV:Body>

</SOAP-ENV:Envelope>
