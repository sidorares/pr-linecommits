var fetch = function(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  //xhr.setRequestHeader('Content-Type','application/json');
  xhr.onreadystatechange = function() {
    if (this.readyState === 4) {
    //if (xhr.status === 204) {
      callback(null, xhr.response);
    //}
    }
  };
  xhr.send();
}

// TODO: move other queries to here
var fileMetaSelector = 'div.meta[data-path]';

var prLineToCommits = {}; // hash: filename:linenum : element

var addHoverHandlers = function() {
  var name, lines, line, i, l, lineMeta, lineNum;
  var files = document.querySelectorAll(fileMetaSelector);
  for(i=0; i < files.length; ++i) {
    name = files[i].getAttribute('data-path');
    lines = files[i].parentNode.querySelectorAll('table.diff-table tr');
    for(l=0; l < lines.length; ++l) {
      line = lines[l];
      lineMeta = line.querySelector('td[data-line-number]');
      if (lineMeta && !lineMeta.classList.contains('blob-num-context')) {
        lineNum = lineMeta.getAttribute('data-line-number');
        (function(fileName, lineNum, line) {
          var key = [fileName,lineNum].join(':');
          line.addEventListener('mouseleave', function(ev) {
            var oldBox = document.querySelector('.commits-box');
            if (oldBox)
              document.body.removeChild(oldBox);
          });
          line.addEventListener('mouseenter', function(ev) {
            // calculate line dimensions
            var bodyRect = document.body.getBoundingClientRect();
            var lineRect = line.getBoundingClientRect();
            var lineTop  = lineRect.top - bodyRect.top;
            var lineLeft = lineRect.left - bodyRect.left;

            if (prLineToCommits[key]) {
              var oldBox = document.querySelector('.commits-box');
              if (oldBox)
                document.body.removeChild(oldBox);
              var box      = document.createElement('div');
              var innerBox = document.createElement('div');
              var list = document.createElement('ul');
              box.classList.add('commits-box');
              innerBox.classList.add('arrow_box');
              innerBox.appendChild(list);
              box.appendChild(innerBox);
              prLineToCommits[key].forEach(function(ele) {
                var clone = ele.cloneNode(true);
                list.appendChild(clone);
              });
              document.body.appendChild(box);
              var boxRect = box.getBoundingClientRect();
              box.style.left = (lineLeft - boxRect.width - 5) + 'px';
              box.style.top = lineTop + lineRect.height/2 - boxRect.height/2 + 'px';
            }
          });
        })(name, lineNum, line);
      }
    }
  }
}

var addMapping = function(commitPageBody, sha, commitEle) {
  var commitPage = document.createElement('div');
  commitPage.innerHTML = commitPageBody;
  var files = commitPage.querySelectorAll(fileMetaSelector);
  var name, lines, lineNum, key, mappedEles;
  for (var i=0; i < files.length; ++i) {
    name = files[i].getAttribute('data-path');
    lines = files[i].parentNode.querySelectorAll('.blob-num[data-line-number]');
    for (var l=0; l < lines.length; ++l) {
      // skip context, only add deletion/addition/modification
      if (!lines[l].classList.contains('blob-num-context')) {
        lineNum = lines[l].getAttribute('data-line-number');
        //console.log([name, sha, lineNum].join('  :  '))
        key = [name,lineNum].join(':');
        mappedEles = prLineToCommits[key];
        if (mappedEles) {
          // same lines on one commit page (for example, one for deletion and one for addition)
          // insert reference to commit only once
          if (mappedEles.indexOf(commitEle) === -1)
            mappedEles.push(commitEle);
        }
        else
          prLineToCommits[key] = [commitEle];
      }
    }
  }
}

var retrieveCommits = function () {
  var commitLiElements = document.querySelectorAll('.commits-listing .commit');
  var commitData, sha, repo;
  for (var i=0; i < commitLiElements.length; ++i) {
    commitData = commitLiElements[i].getAttribute('data-channel').split(':');
    sha = commitData[2];
    repo = commitData[0];
    (function(commitEle, repo, sha) {
      fetch('https://github.com/' + repo + '/commit/' + sha, function(err, response) {
        addMapping(response, sha, commitEle);
      });
    })(commitLiElements[i], repo, sha);
  }
}

window.onload = function() {
  addHoverHandlers();
  retrieveCommits();
}
