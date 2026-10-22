package io.orbit.security.settings;

import org.w3c.dom.Attr;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Workspace logo (FE-10) sanitizer: parses the SVG with a hardened JDK parser (no DOCTYPE, no
 * entities, no external resources) and keeps only an allowlist of drawing elements and presentation
 * attributes. Scripts, event handlers, {@code foreignObject}, {@code style}, links, images and any
 * reference that is not a local fragment ({@code #id}) are removed. The frontend sanitizes again
 * before display; this keeps orbit.settings.json and the wall snapshot clean.
 */
public final class SvgSanitizer {

    public static final int MAX_LENGTH = 64 * 1024;
    private static final String SVG_NS = "http://www.w3.org/2000/svg";
    private static final Set<String> ELEMENTS = Set.of("svg", "g", "path", "circle", "ellipse", "rect", "line",
            "polyline", "polygon", "text", "tspan", "defs", "lineargradient", "radialgradient", "stop", "title",
            "desc", "clippath", "mask", "use", "symbol", "pattern");
    private static final Set<String> ATTRIBUTES = Set.of("xmlns", "viewbox", "width", "height", "x", "y", "x1", "y1",
            "x2", "y2", "cx", "cy", "r", "rx", "ry", "d", "points", "fill", "fill-opacity", "fill-rule", "stroke",
            "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray",
            "stroke-dashoffset", "stroke-miterlimit", "opacity", "transform", "id", "class", "offset", "stop-color",
            "stop-opacity", "gradientunits", "gradienttransform", "spreadmethod", "fx", "fy", "clip-path",
            "clip-rule", "mask", "font-family", "font-size", "font-weight", "text-anchor", "dominant-baseline",
            "preserveaspectratio", "role", "aria-label", "aria-hidden", "href", "xlink:href", "xmlns:xlink",
            "patternunits", "patterntransform", "version", "letter-spacing", "dx", "dy", "visibility", "display");
    private static final Pattern UNSAFE_VALUE = Pattern.compile("(?i)(javascript:|data:|url\\s*\\(\\s*['\"]?(?!#)|expression\\s*\\()");

    private SvgSanitizer() {
    }

    /** @throws IllegalArgumentException when the text is not a well-formed, reasonably small SVG */
    public static String sanitize(String svg) {
        if (svg == null || svg.isBlank()) {
            throw new IllegalArgumentException("logoSvg is empty");
        }
        if (svg.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("logoSvg must be at most " + MAX_LENGTH / 1024 + " KB");
        }
        Document document = parse(svg);
        Element root = document.getDocumentElement();
        if (!"svg".equals(localName(root))) {
            throw new IllegalArgumentException("logoSvg must be an <svg> document");
        }
        clean(root);
        if (!root.hasAttribute("xmlns")) {
            root.setAttribute("xmlns", SVG_NS);
        }
        return serialize(document);
    }

    private static void clean(Element element) {
        List<Attr> drop = new ArrayList<>();
        NamedNodeMap attributes = element.getAttributes();
        for (int i = 0; i < attributes.getLength(); i++) {
            Attr attr = (Attr) attributes.item(i);
            String name = attr.getName().toLowerCase(Locale.ROOT);
            boolean allowed = ATTRIBUTES.contains(name) && !UNSAFE_VALUE.matcher(attr.getValue()).find()
                    && (!name.endsWith("href") || attr.getValue().strip().startsWith("#"));
            if (!allowed || name.startsWith("on")) {
                drop.add(attr);
            }
        }
        drop.forEach(element::removeAttributeNode);
        List<Node> children = new ArrayList<>();
        for (Node child = element.getFirstChild(); child != null; child = child.getNextSibling()) {
            children.add(child);
        }
        for (Node child : children) {
            switch (child.getNodeType()) {
                case Node.ELEMENT_NODE -> {
                    if (ELEMENTS.contains(localName(child))) {
                        clean((Element) child);
                    } else {
                        element.removeChild(child);
                    }
                }
                case Node.TEXT_NODE -> {
                    // text of <text>, <title> and <desc>
                }
                default -> element.removeChild(child);
            }
        }
    }

    private static String localName(Node node) {
        String name = node.getLocalName() == null ? node.getNodeName() : node.getLocalName();
        return name.toLowerCase(Locale.ROOT);
    }

    private static Document parse(String svg) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            factory.setNamespaceAware(true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            builder.setErrorHandler(null);
            return builder.parse(new InputSource(new StringReader(svg)));
        } catch (ParserConfigurationException | SAXException | IOException e) {
            throw new IllegalArgumentException("logoSvg is not a valid SVG document");
        }
    }

    private static String serialize(Document document) {
        try {
            TransformerFactory factory = TransformerFactory.newInstance();
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_STYLESHEET, "");
            Transformer transformer = factory.newTransformer();
            transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "yes");
            StringWriter out = new StringWriter();
            transformer.transform(new DOMSource(document), new StreamResult(out));
            return out.toString();
        } catch (TransformerException e) {
            throw new IllegalArgumentException("logoSvg could not be written");
        }
    }
}
