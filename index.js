#!/usr/bin/env node
const { program } = require("commander");
const net = require("net");
const log = require("loglevel");

const logger = log.getLogger("index");
logger.setLevel("info");

const ACCEPTED_PROTOCOLS = ["http:", "https:"];
const ACCEPTED_METHODS = ["GET", "DELETE", "PUT", "POST"];
const BODY_ALLOWED_METHODS = ["POST", "PUT"];

class UnrecognisableProtocol extends Error {}

class BadHttpMethod extends Error {}

class BodyNotAllowedMethod extends Error {}

class SocketConnectionError extends Error {}

class NoContentTypeHeader extends Error {}

class NoBodyError extends Error {}

program
  .version("1.0.0")
  .argument("<string>", "url")
  .option("-X --method <string>", "http method")
  .option("-v, --verbose", "verbose")
  .option("-d --body <jsonString>", "http payload data")
  .option(
    "-H, --header <string...>",
    "specify custome headers for curl command",
  )
  .parse(process.argv);

const validateMethod = (method) => {
  const httpMethod = method || "GET";
  if (!ACCEPTED_METHODS.includes(httpMethod)) {
    throw new BadHttpMethod(
      `method: ${method} unsupported, supported methods ${ACCEPTED_METHODS}`,
    );
  }
  return httpMethod;
};

const validateBody = (body, method) => {
  if (body && !BODY_ALLOWED_METHODS.includes(method)) {
    logger.error(`body provided for unsupported method type ${method}`);
    throw new BodyNotAllowedMethod();
  }
};

const buildBaseProtocolText = ({
  host,
  pathname,
  protocol,
  method,
  headers = undefined,
}) => {
  if (!ACCEPTED_PROTOCOLS.includes(protocol)) {
    logger.error(
      `uh oh edly-curl only supports ${ACCEPTED_PROTOCOLS}, ${protocol} provided`,
    );
    throw new UnrecognisableProtocol();
  }
  console.log(method);
  return [
    `${method} ${pathname} HTTP/1.1`,
    `Host: ${host}`,
    `Accept: */*`,
    `Connection: close`,
    ...(headers || []),
  ];
};

const createSocketConnection = (host, port, protocolText) => {
  const socket = net.createConnection({ host, port }, () => {
    socket.write(protocolText);
  });
  return socket;
};

const handleData = (data) => {
  const dataStr = data.toString();
  const [headers, response] = dataStr.split("\r\n\r\n");
  logger.debug(headers);
  logger.info(response);
};

function handleSocketEvents(host, port, httpProtocol) {
  const socket = createSocketConnection(host, port, httpProtocol);
  socket.on("data", (data) => {
    handleData(data);
  });
  socket.on("error", (error) => {
    logger.error("Error:", error.message);
    socket.end();
    throw new SocketConnectionError();
  });
}

function checkForContentType(httpProtocol) {
  const contentType = httpProtocol.filter((x) => x.startsWith("Content-Type"));
  if (!contentType.length) {
    logger.error("No Content-Type header has been supplied");
    throw new NoContentTypeHeader();
  }
}

function checkForBody(body) {
  if (!body) {
    // assume post and puts always need a body (not always the case)
    logger.error("no body has identified");
    throw new NoBodyError();
  }
}

function putAndPostHttpExtension(body, httpProtocol) {
  checkForBody(body);
  checkForContentType(httpProtocol);
  const bodyLength = body ? Buffer.byteLength(body) : 0;
  const contentLengthHeader = `content-Length: ${bodyLength}`;
  return [...httpProtocol, contentLengthHeader, "", body];
}

const main = (url, options) => {
  const { method, body, header } = options;
  const httpMethod = validateMethod(method);
  validateBody(body, method);

  const { host, pathname, protocol } = new URL(url);
  const port = protocol === "http:" ? 80 : 443;

  let httpProtocol = buildBaseProtocolText({
    host,
    pathname,
    protocol,
    method: httpMethod,
    headers: header,
  });
  if (BODY_ALLOWED_METHODS.includes(method)) {
    httpProtocol = putAndPostHttpExtension(body, httpProtocol);
  }

  const formattedHttpProtocol = `${httpProtocol.join("\r\n")}\r\n\r\n`;
  logger.debug(formattedHttpProtocol);
  handleSocketEvents(host, port, formattedHttpProtocol);
};

if (require.main === module) {
  const opt = program.opts();
  if (opt.verbose) {
    logger.setLevel("debug");
  }
  main(program.args[0], opt);
}
