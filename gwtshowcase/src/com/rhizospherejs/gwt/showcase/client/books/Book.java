/*
  Copyright 2011 The Rhizosphere Authors. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

package com.rhizospherejs.gwt.showcase.client.books;

import com.google.gwt.core.client.JavaScriptObject;

/**
 * Wrapper object to define a Book object from the JSON response returned
 * by Google Book Search.
 * See http://code.google.com/apis/books/docs/js/reference.html#handle_search_results.
 * @author battlehorse@google.com (Riccardo Govoni)
 */
public final class Book extends JavaScriptObject {
  protected Book() {}

  public native void addModelIdAndQuery(String query) /*-{
    this['id'] = this['bookId'];
    this['query'] = query;
  }-*/;

  public native String getAuthors() /*-{
    return this['authors'];
  }-*/;

  public native String getBookId() /*-{
    return this['bookId'];
  }-*/;

  public native int getNumberOfPages() /*-{
    return parseInt(this['pageCount'], 10);
  }-*/;

  public native int getPublishedYear() /*-{
    return parseInt(this['publishedYear'], 10);
  }-*/;

  public native int getThumbnailWidth() /*-{
    return parseInt(this['tbWidth'], 10);
  }-*/;

  public native int getThumbnailHeight() /*-{
    return parseInt(this['tbHeight'], 10);
  }-*/;

  public native String getThumbnailUrl() /*-{
    return this['tbUrl'];
  }-*/;

  public native String getTitle() /*-{
    return this['titleNoFormatting'];
  }-*/;

  public native String getUrl() /*-{
    return this['unescapedUrl'];
  }-*/;

  public native String getQuery() /*-{
    return this['query'];
  }-*/;
}
