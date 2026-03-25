FROM openaf/mini-a:deb-t8

USER root
RUN apt-get update -y\
 && apt-get install -y curl bash\
 && curl -fsSL https://gh.io/copilot-install | bash\
 && apt-get clean\
 && rm -rf /var/lib/apt/lists/*\
 && rm -rf /tmp/*\
 && rm -rf /var/tmp/*\
 && /openaf/opack install ghcopilot

ENV OAF_MINI_A_LIBS="@ghcopilot/ghcopilot.js"

USER openaf
