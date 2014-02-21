<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope
    xmlns:SOAP-ENV="<%= envelope.soap_env%>"
    xmlns:xsd="<%= envelope.xml_schema%>"

    <% if (envelope.namespaces.length != 0) { %>
        <% _.each(envelope.namespaces, function(namespace, index) { %>
            xmlns:ns<%=index%>="<%=namespace%>"
        <% }); %>
    <% } %>>

    <!-- available head -->
    <% if (head.length !== 0) { %>
        <SOAP-ENV:Header>
            <% _.each(head, function(headItem) { %>
                <%= headItem%>
            <% }); %>
        </SOAP-ENV:Header>
    <% } %>

    <SOAP-ENV:Body>
        <% if (body.namespace !== null) {%>
            <ns<%= body.namespace%>:<%=body.method%>>
        <% } else {%>
            <<%=body.method%>>
        <% } %>

            <% if (body.params !== false) {%>
                <%= body.params%>
            <% } %>

        <% if (body.namespace !== null) {%>
            </ns<%= body.namespace%>:<%=body.method%>>
        <% } else { %>
            </<%=body.method%>>
        <% } %>
    </SOAP-ENV:Body>


</SOAP-ENV:Envelope>