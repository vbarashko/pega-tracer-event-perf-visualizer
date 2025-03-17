export const parseDateTime = (dateTimeStr) => {
  console.log('Parsing datetime string:', dateTimeStr);
  if (!dateTimeStr) return null;
  
  try {
    // Format: YYYYMMDDTHHMMSS.sss GMT
    const match = dateTimeStr.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})\.(\d{3})/);
    if (!match) {
      console.error('Invalid datetime format:', dateTimeStr);
      return null;
    }

    // Destructure match array, ignoring first element (full match)
    const [, year, month, day, hour, minute, second, millisecond] = match;
    
    const date = new Date(Date.UTC(
      parseInt(year),
      parseInt(month) - 1, // Months are 0-based
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second),
      parseInt(millisecond)
    ));

    console.log('Parsed date:', date);
    return date;
  } catch (err) {
    console.error('Error parsing datetime:', dateTimeStr, err);
    return null;
  }
};

export const parseTracerData = (xmlText) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  
  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid XML format in tracer file');
  }

  // Helper functions
  const getDateTime = (event) => {
    const dateTimeElement = event.getElementsByTagName('DateTime')[0];
    console.log('DateTime element:', dateTimeElement);
    const datetime = dateTimeElement ? dateTimeElement.textContent.trim() : null;
    console.log('DateTime content:', datetime);
    return datetime;
  };

  const getInteraction = (event) => {
    const interactionElement = event.getElementsByTagName('Interaction')[0];
    return interactionElement ? interactionElement.textContent : 'Unknown';
  };

  const getStartTime = (firstEvent) => {
    const firstDateTime = getDateTime(firstEvent);
    return firstDateTime ? parseDateTime(firstDateTime).getTime() : Date.now();
  };

  const traceEvents = Array.from(xmlDoc.getElementsByTagName('TraceEvent'));
  const startTime = getStartTime(traceEvents[0]);
  
  // Create interaction groups object
  const interactionGroups = {};
  const stack = [];
  
  traceEvents.forEach((event) => {
    const name = event.getAttribute('name') || '';
    const keyname = event.getAttribute('keyname') || name;
    const stepMethod = event.getAttribute('stepMethod') || '';
    const eventType = event.getAttribute('eventType') || '';
    const sequence = event.getAttribute('sequence') || '';
    const baseName = keyname;
    const interaction = getInteraction(event);
    
    const eventDateTime = getDateTime(event);
    const eventTimeMs = parseDateTime(eventDateTime)?.getTime();
    const relativeTimeSeconds = eventTimeMs ? (eventTimeMs - startTime) / 1000 : 0;

    const isBegin = stepMethod.includes('Begin') || 
                    eventType.includes('Begin') ||
                    (name.includes('Data Page') && stepMethod.includes('Load Begin'));
                    
    const isEnd = stepMethod.includes('End') || 
                  eventType.includes('End') ||
                  (name.includes('Data Page') && stepMethod.includes('Load End'));

    // Skip Data Page instance found/fresh events
    if (name.includes('Data Page') && 
        (stepMethod.includes('instance found') || 
         stepMethod.includes('is fresh'))) {
      return;
    }

    if (isBegin) {
      const newNode = {
        name: baseName,
        startSequence: sequence,
        endSequence: null,
        children: [],
        interaction,
        startTime: relativeTimeSeconds,
        startTimeMs: eventTimeMs,
        endTime: null,
        endTimeMs: null,
        stepMethod,
        eventType,
        rawDateTime: eventDateTime
      };
      
      if (stack.length > 0) {
        stack[stack.length - 1].children.push(newNode);
      } else {
        // Create interaction group if it doesn't exist
        if (!interactionGroups[interaction]) {
          interactionGroups[interaction] = {
            name: `Interaction ${interaction}`,
            children: [],
            interaction,
            startTime: relativeTimeSeconds,
            startTimeMs: eventTimeMs,
            startSequence: sequence,
            endSequence: null,
            rawDateTime: eventDateTime
          };
        }
        interactionGroups[interaction].children.push(newNode);
      }
      stack.push(newNode);
    }
    else if (isEnd) {
      if (stack.length > 0 && stack[stack.length - 1].name === baseName) {
        const node = stack.pop();
        node.endTime = relativeTimeSeconds;
        node.endTimeMs = eventTimeMs;
        node.duration = (node.endTimeMs - node.startTimeMs) / 1000;
        node.endSequence = sequence;
        
        // Update interaction group end time if this is a top-level node
        if (stack.length === 0) {
          const group = interactionGroups[node.interaction];
          if (group) {
            group.endTime = relativeTimeSeconds;
            group.endTimeMs = eventTimeMs;
            group.duration = (group.endTimeMs - group.startTimeMs) / 1000;
            group.endSequence = sequence;
          }
        }
      }
    }
  });

  // Convert interaction groups to array and sort by startTime
  const sortedGroups = Object.values(interactionGroups).sort((a, b) => a.startTime - b.startTime);
  
  // Debug log to check the data
  console.log('First interaction group:', sortedGroups[0]);
  console.log('Last interaction group:', sortedGroups[sortedGroups.length - 1]);
  
  return sortedGroups;
}; 