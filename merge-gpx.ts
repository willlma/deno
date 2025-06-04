const helpText = `
This is for when you forgot to record part of activity.
1. Download the activity GPX
2. Create a route from the missing chunk and download it (only supports one pause for now)
3. Run this script from the terminal with: \`gpx activity.gpx route.gpx\`.
--breakMins (-b) or --start (-s) should be passed if it's in the middle or start of the activity, respectively.
`;
// TODO: take an activity ID instead of a file name (and maybe same for route)
//
import { parseArgs } from "jsr:@std/cli/parse-args";

const searchString = "trkseg";

// If I want to replace Deno down the road, I should just be able to rewrite this class
class TechnicalCode {
  static readFiles(fileNames: string[]) {
    return Promise.all(
      fileNames.map((fileName: string) => Deno.readTextFile(fileName)),
    );
  }

  static writeFile(fileName, activity) {
    return Deno.writeTextFile(fileName, activity);
  }
}

const getTrackSegmentEnd = (activity: string) =>
  activity.lastIndexOf(searchString) + searchString.length + 1;

function getTrackSegment(activity: string) {
  const start = activity.indexOf(searchString) - 1;
  const end = getTrackSegmentEnd(activity);
  return activity.substring(start, end);
}

(async function main() {
  const { _: fileNames } = parseArgs(Deno.args);
  const [activity1, activity2] = await TechnicalCode.readFiles(fileNames);
  const trackSegment2 = getTrackSegment(activity2);
  const end1 = getTrackSegmentEnd(activity1);
  const result = [
    activity1.substring(0, end1),
    "\n  ",
    trackSegment2,
    activity1.substring(end1),
  ].join("");
  const directory = fileNames[0].substring(0, fileNames[0].lastIndexOf("/"));
  return TechnicalCode.writeFile(`${directory}/Merged.gpx`, result);

  if (help) return console.log(helpText);
})();
