import { useEffect, useState } from "react";
import "../styles/content-feed.scss";

import { ContentFetcher } from "../../content-fetcher";
import ContentBlock from "./ContentBlock";

import loadingSvg from "../images/loading-wwt.svg";

function ContentFeed({}) {
    const [feedSettings, setFeedSettings] = useState();
    const [loading, setLoading] = useState(false);
    const [contentFeed, setContentFeed] = useState(null);
    const [keywords, setKeywords] = useState([]);
    const [dataAttempts, setDataAttempts] = useState(0);
    const attemptsMax = 5;

    const saveNewContentFeed = (newContentFeed) => {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ 
                action: "saveContentFeed",
                contentFeed: newContentFeed
            });
            resolve(true)
        })
    }

    const getNewContentFeed = () => {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ 
                action: "getSearchQueries"
            }, async (response) => {
                console.log("response", response)
                if (!response.searchQueries) {
                   resolve(null);
                }
                const newContentFeed = await ContentFetcher(feedSettings.sourcing, response.searchQueries)
                if (newContentFeed && newContentFeed.length > 0) {
                    await saveNewContentFeed(newContentFeed);
                    resolve(newContentFeed);
                } else {
                    resolve(null)
                }
            });
        })
    }

    useEffect(async () => {
        if (!contentFeed && feedSettings && dataAttempts < attemptsMax) {
            setLoading(true);
            console.log("fetching content feed")
            chrome.runtime.sendMessage({ 
                action: "getContentFeed"
            }, async (response) => {

                console.log("response", response)
                if (response.contentFeed) {
                    console.log("got content feed", response.contentFeed)
                    setContentFeed(response.contentFeed)
                } else {
                    console.log("did not get content feed, getting new content feed")
                    const newContentFeed = await getNewContentFeed()
                    console.log(newContentFeed);
                    if (newContentFeed && newContentFeed.length > 0) {
                        setContentFeed(newContentFeed);
                    }
                }
                setLoading(false);

                setDataAttempts(dataAttempts + 1)

            });
        }
    }, [contentFeed, feedSettings, dataAttempts]);

    useEffect(() => {
        if (!feedSettings && dataAttempts < attemptsMax) {
            chrome.runtime.sendMessage({ 
                action: "getFeedSettings"
            }, async (response) => {
                setFeedSettings(response.feedSettings)
                setDataAttempts(dataAttempts + 1)
            });
        }
    }, [dataAttempts]);

    useEffect(() => {
        if (!keywords && dataAttempts < attemptsMax) {
            chrome.runtime.sendMessage({ 
                action: "getKeywords"
            }, (response) => {
                console.log(response.keywords);
                if (response.keywords) {
                    setKeywords(response.keywords);
                }
                setDataAttempts(dataAttempts + 1)
            });
        }
    }, [dataAttempts]);

    return <div className="content-feed flex flex-column">
        {loading && <div className="full-width flex align-center flex-column justify-center">
            <img src={loadingSvg} />
            <span>Please wait for your daily feed to load (~10-15 seconds)</span>
        </div>}
        
        {!loading && feedSettings?.refreshMode && <div className="content-feed__refresh" onClick={async () => {
                setLoading(true);
                const newContentFeed = await getNewContentFeed()
                console.log(newContentFeed);
                if (newContentFeed && newContentFeed.length > 0) {
                    setContentFeed(newContentFeed);
                }
                setLoading(false);
        }}>Refresh</div>}

        {!loading && contentFeed && contentFeed.length > 0 && <div className="full-width flex align-center flex-column justify-center">
        
            {contentFeed.map((content) => {
                return <ContentBlock content={content} />
            })}
        </div>}
        {!loading && (!contentFeed || contentFeed.length === 0) && <div className="full-width flex align-center flex-column justify-center">
            {keywords && keywords.length > 0 && <span>Could not find content</span>}
            {!keywords || keywords.length === 0 && <div>No data yet :( start browsing and build up your algorithm</div>}
        </div>}
    </div>
}

export default ContentFeed;